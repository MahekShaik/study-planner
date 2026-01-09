const { getTasks, saveTasks, getUserByEmail, getOnboarding, deletePendingTasks, updateOnboarding, getQuizResults } = require('./db');
const { callGeminiWithRetry, parseGeminiJson } = require('./geminiUtils');

/**
 * Intelligent Planning Engine (Gemini-Powered)
 * Responsible for autonomous adjustments based on performance, mood, and missed deadlines.
 */
class PlanningEngine {

    /**
     * Re-plans all future/missed tasks using Gemini's intelligence.
     * Considers: Today's date, Exam date, Current mood, Performance status, and Daily hours.
     * Strict Rules: Runs only once per day per plan to maintain stability (unless force=true).
     */
    static async ensureOptimalPlan(userEmail, currentMood = 'okay', force = false) {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const user = await getUserByEmail(userEmail);
            const onboardingEntries = await getOnboarding(userEmail); // Get ALL plans

            if (!onboardingEntries || onboardingEntries.length === 0) return { redistributed: false };

            // 1. Filter out inactive plans (expired exams) to prevent old tests from triggering replans
            const activeEntries = onboardingEntries.filter(entry => {
                const plan = entry.onboardingData;
                if (!plan) return false;
                if (plan.mode === 'exam' && plan.examDate) {
                    return plan.examDate >= todayStr;
                }
                return true; // Skill mode or other plans remain active
            });

            if (activeEntries.length === 0) {
                console.log(`[PlanningEngine] No active plans for ${userEmail}. Skipping replan.`);
                return { redistributed: false };
            }

            // Check if ANY active plan needs replanning today
            const triggeringEntry = activeEntries.find(entry => entry.lastReplanned !== todayStr);
            const needsReplan = !!triggeringEntry || force;

            if (needsReplan) {
                if (force) {
                    console.log(`[PlanningEngine] FORCE replan triggered for ${userEmail} (lastReplanned: ${triggeringEntry?.lastReplanned || 'never'})`);
                } else {
                    console.log(`[PlanningEngine] Replan triggered for ${userEmail} by active entry: ${triggeringEntry.id} (lastReplanned: ${triggeringEntry.lastReplanned || 'never'})`);
                }
            } else {
                return { redistributed: false };
            }

            console.log(`[PlanningEngine] Holistic re-balancing for ${userEmail}. Mood: ${currentMood}`);

            const allTasks = await getTasks(userEmail);
            const dailyHours = user.dailyHours || 4;
            const quizResults = await getQuizResults(userEmail);

            // 1. Prepare context for ALL plans
            const plansContext = onboardingEntries.map(entry => {
                const plan = entry.onboardingData;
                const planSubject = plan.level || plan.skill || 'General';
                const planTasks = allTasks.filter(t => {
                    const taskSubject = (t.subject || '').toLowerCase();
                    const targetSubject = planSubject.toLowerCase();
                    return taskSubject.includes(targetSubject) || targetSubject.includes(taskSubject);
                });

                const missedTasks = planTasks.filter(t => t.status === 'pending' && t.date < todayStr);
                const pendingTasks = planTasks.filter(t => t.status === 'pending' && t.date >= todayStr);
                const unfinishedTopics = [...missedTasks, ...pendingTasks].map(t => t.subtopic);

                const examDate = plan.examDate || 'No deadline';
                let isCrunchMode = false;
                if (plan.mode === 'exam' && examDate !== 'No deadline') {
                    const diffDays = Math.ceil((new Date(examDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                    isCrunchMode = diffDays <= 3;
                }

                // Summarize quiz performance for this specific plan
                const relevantQuizzes = quizResults.filter(q => {
                    const subject = (q.subject || '').toLowerCase();
                    const target = planSubject.toLowerCase();
                    return subject.includes(target) || target.includes(subject);
                }).slice(0, 5); // Last 5 quizzes

                const avgScore = relevantQuizzes.length > 0
                    ? (relevantQuizzes.reduce((acc, q) => acc + (q.score / q.total), 0) / relevantQuizzes.length) * 100
                    : null;

                return {
                    id: entry.id,
                    subject: planSubject,
                    mode: plan.mode, // 'exam' or 'skill'
                    examDate: examDate,
                    isCrunchMode: isCrunchMode,
                    unfinishedTopics: unfinishedTopics,
                    totalPendingTasks: unfinishedTopics.length,
                    performanceIndex: avgScore ? `${avgScore.toFixed(0)}% accuracy` : 'No data yet',
                    recentWeakTopics: [...new Set(relevantQuizzes.flatMap(q => q.weakSubtopics || []))]
                };
            });

            const moodMap = {
                'fresh': 'Focus on intense Core Learning and new complex topics. Energy is high.',
                'calm': 'Steady progress. Balanced mix of learning and moderate practice.',
                'okay': 'Neutral balance. Follow standard curriculum sequence.',
                'tired': 'Shift to Reinforcement Revision and light practice. Avoid heavy new theory.',
                'stressed': 'Focus on Comfort Revision and very easy tasks to build confidence.'
            };

            // 2. Prepare Holistic AI Prompt
            const prompt = `You are an agentic study planner. Your goal is to REPLAN a student's schedule across MULTIPLE goals.
            
            USER PROFILE:
            - User Streak: ${user.currentStreak || 0} days
            - User Daily Capacity: ${dailyHours} hours/day
            - Current Mood: ${currentMood.toUpperCase()} (${moodMap[currentMood] || 'Neutral'})
            
            ACTIVE GOALS & STATUS:
            ${JSON.stringify(plansContext, null, 2)}
            
            ---------------------------------------------------------
            STRICT PLANNING CONSTRAINTS (MANDATORY)
            ---------------------------------------------------------
            1. TASK COUNT CONSISTENCY: For each subject, the number of tasks in your output MUST MATCH the 'totalPendingTasks' count provided. Do NOT add new topics or remove existing ones.
               - EXCEPTION: If 'isCrunchMode' is true for an EXAM plan, you MAY drop optional or minor subtopics to focus on high-yield revision. This is the ONLY exception.
            
            2. MODE-SPECIFIC LOGIC:
               A. SKILL MODE (mode: 'skill'):
                  - USE performance metrics: If 'performanceIndex' < 60% or specific 'recentWeakTopics' exist, prioritize "Practice" or "Reinforcement Revision" for those topics today/tomorrow.
                  - REPLAN based on Mood: Adjust session intensity/order based on current state.
                  - NO CRUNCH MODE: Every single task MUST be preserved. No topics can be dropped.
                  - CHRONOLOGICAL SHIFT: If tasks were missed in the past, simply shift the entire sequence forward starting from ${todayStr}.
               
               B. EXAM MODE (mode: 'exam'):
                  - USE performance metrics: If 'performanceIndex' < 60% or specific 'recentWeakTopics' exist, prioritize "Practice" or "Reinforcement Revision" for those topics today/tomorrow.
                  - CRUNCH MODE EXCEPTION: Total task count remains same UNLESS in Crunch Mode (< 3 days to exam), where optional items can be dropped.
            
            3. STREAK MAINTENANCE: Acknowledge the user's ${user.currentStreak || 0}-day streak in 'aiExplanation' to keep them motivated.
            
            4. MOOD DISTRIBUTION: 
               - If 'FRESH': Assign the most complex/intense subtopics to TODAY.
               - If 'TIRED/STRESSED': Assign easier, revision-based, or bite-sized subtopics to TODAY.
            
            5. BALANCED LOAD (PRIORITY WEIGHTED): Distribute total time across ALL active subjects daily. 
               - Subjects with exams < 7 days away should receive roughly 70% of the daily capacity.
               - Ensure NO subject is completely starved (minimum 30-45 mins if tasks exist).
            
            6. AVAILABILITY GUARD: Usually, total duration per day MUST NOT exceed ${dailyHours} hours.
               - EXCEPTION: Crunch Mode for exams SHALL ignore this limit to ensure readiness.
            
            OUTPUT:
            Return ONLY a raw JSON array of task objects.
            Format: [{"subject": "Exact Subject Name", "topic": "Topic Name", "subtopic": "Subtopic", "duration": "45 mins", "date": "YYYY-MM-DD", "sessionType": "Core Learning", "aiExplanation": "...", "status": "pending"}]`;

            try {
                const text = await callGeminiWithRetry({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" },
                    source: `Holistic Planning Engine (${userEmail})`
                });

                const newTasks = parseGeminiJson(text);

                if (Array.isArray(newTasks) && newTasks.length > 0) {
                    // 3. Delete old pending tasks FIRST (before saving new ones)
                    for (const entry of plansContext) {
                        await deletePendingTasks(userEmail, entry.subject);
                    }

                    // 4. Now save all new tasks (they won't be deleted since old ones are already gone)
                    const tasksToSave = newTasks.map(t => ({ ...t, userEmail }));
                    await saveTasks(userEmail, tasksToSave);

                    // 5. Mark all plans as updated
                    for (const entry of activeEntries) {
                        await updateOnboarding(entry.id, userEmail, { lastReplanned: todayStr });
                    }

                    console.log(`[PlanningEngine] Holistic replan complete. ${newTasks.length} tasks saved.`);
                    return { redistributed: true, count: newTasks.length };
                } else {
                    console.warn(`[PlanningEngine] No new tasks generated. Keeping existing tasks.`);
                    return { redistributed: false, count: 0 };
                }
            } catch (err) {
                console.error(`[PlanningEngine] Holistic AI/Parsing Error:`, err.message);

                // CRITICAL: Even if it fails, we mark it as "replanned" for TODAY to stop the infinite loop.
                // This ensures the user can still see the dashboard (even if it's the old plan) instead of being stuck.
                console.warn(`[PlanningEngine] Marking plans as updated for today anyway to break loop.`);
                for (const entry of activeEntries) {
                    await updateOnboarding(entry.id, userEmail, { lastReplanned: todayStr });
                }

                return { error: err.message, redistributed: false };
            }

            return { redistributed: false };

        } catch (error) {
            console.error('[PlanningEngine] ensureOptimalPlan error:', error);
            return { error: error.message };
        }
    }

    /**
     * Adjustment for mood - now just triggers a clean replan pass.
     */
    static async adjustTasksForMood(userEmail, mood) {
        return this.ensureOptimalPlan(userEmail, mood);
    }

    /**
     * Marks a topic as weak and enforces a replan.
     */
    static async markTopicAsWeak(userEmail, topicName) {
        // We could just tag the task in DB first, then replan
        // For simplicity, we just trigger the engine which has the 'completed' context
        // In a real system, we'd tag the topic in User profile or Task.
        console.log(`[PlanningEngine] Marking ${topicName} as weak for ${userEmail}`);
        return this.ensureOptimalPlan(userEmail);
    }

    /**
     * Spaced Repetition logic remains programmatic as it's a fixed rule (1-4-7)
     */
    static async applySpacedRepetition(tasks, examDate) {
        // Keeping this programmatic as requested in previous steps for standard generation
        const today = new Date();
        const exam = new Date(examDate);
        const diffDays = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 14) return tasks;

        const extraTasks = [];
        const learningTasks = tasks.filter(t => t.sessionType.includes('Learning'));

        for (const task of learningTasks) {
            const day4Date = new Date(task.date);
            day4Date.setDate(day4Date.getDate() + 3);
            const day7Date = new Date(task.date);
            day7Date.setDate(day7Date.getDate() + 6);

            if (day4Date < exam) {
                extraTasks.push({
                    ...task,
                    id: `rev3_${task.id}_${Math.random().toString(36).substr(2, 5)}`,
                    date: day4Date.toISOString().split('T')[0],
                    sessionType: 'Reinforcement Revision',
                    aiExplanation: `Spaced repetition interval: Reviewing ${task.subtopic} to solidify memory.`
                });
            }

            if (day7Date < exam) {
                extraTasks.push({
                    ...task,
                    id: `rev6_${task.id}_${Math.random().toString(36).substr(2, 5)}`,
                    date: day7Date.toISOString().split('T')[0],
                    sessionType: 'Deep Revision',
                    aiExplanation: `Second recall interval: Strengthening neural paths for ${task.subtopic}.`
                });
            }
        }

        return [...tasks, ...extraTasks];
    }
}

module.exports = PlanningEngine;
