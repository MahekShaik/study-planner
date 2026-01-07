const { getTasks, saveTasks, getUserByEmail, getOnboarding, deletePendingTasks, updateOnboarding } = require('./db');
const { callGeminiWithRetry, parseGeminiJson } = require('./geminiUtils');

/**
 * Intelligent Planning Engine (Gemini-Powered)
 * Responsible for autonomous adjustments based on performance, mood, and missed deadlines.
 */
class PlanningEngine {

    /**
     * Re-plans all future/missed tasks using Gemini's intelligence.
     * Considers: Today's date, Exam date, Current mood, Performance status, and Daily hours.
     * Strict Rules: Runs only once per day per plan to maintain stability.
     */
    static async ensureOptimalPlan(userEmail, currentMood = 'okay') {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const user = await getUserByEmail(userEmail);
            const onboardingEntries = await getOnboarding(userEmail); // Get ALL plans

            if (!onboardingEntries || onboardingEntries.length === 0) return { redistributed: false };

            // Check if ANY plan needs replanning today
            // We replan all if even one is outdated to ensure balance across goals
            const needsReplan = onboardingEntries.some(entry => entry.lastReplanned !== todayStr);
            if (!needsReplan) return { redistributed: false };

            console.log(`[PlanningEngine] Holistic re-balancing for ${userEmail}. Mood: ${currentMood}`);

            const allTasks = await getTasks(userEmail);
            const dailyHours = user.dailyHours || 4;

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

                return {
                    id: entry.id,
                    subject: planSubject,
                    mode: plan.mode, // 'exam' or 'skill'
                    examDate: examDate,
                    isCrunchMode: isCrunchMode,
                    unfinishedTopics: unfinishedTopics,
                    totalPendingTasks: unfinishedTopics.length
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
            
            CONTEXT:
            - Today's Date: ${todayStr}
            - User's Total Daily Capacity: ${dailyHours} hours/day
            - Current Mood: ${currentMood.toUpperCase()} (${moodMap[currentMood] || 'Neutral'})
            
            ACTIVE GOALS & STATUS:
            ${JSON.stringify(plansContext, null, 2)}
            
            STRICT RULES:
            1. TASK COUNT CONSISTENCY: For each subject, the number of tasks in your output MUST MATCH the 'totalPendingTasks' count provided. Do NOT add or remove topics.
            2. SKILL MODE SHIFT: For plans where mode is 'skill', if there are missed tasks, simply shift the schedule forward. The original duration (e.g. 4 weeks) can be exceeded.
            3. CRUNCH MODE (EXAM ONLY): If 'isCrunchMode' is true for an exam plan, you MAY drop optional or minor subtopics to focus on high-yield revision. This is the ONLY exception to Rule 1.
            4. MOOD DISTRIBUTION: Redistribute the SAME number of unfinished topics according to the student's mood. 
               - If 'FRESH': Assign the most complex/intense subtopics to TODAY.
               - If 'TIRED/STRESSED': Assign easier, revision-based, or bite-sized subtopics to TODAY.
            5. BALANCED LOAD (PRIORITY WEIGHTED): Distribute the total time across ALL active subjects daily. 
               - Subjects with exams < 7 days away should receive roughly 70% of the daily capacity.
               - Ensure NO subject is completely starved (minimum 30-45 mins if tasks exist).
            6. AVAILABILITY GUARD: Usually, the total duration of tasks on any single day MUST NOT exceed ${dailyHours} hours.
               - EXCEPTION: If 'isCrunchMode' is true for ANY exam plan, you SHALL ignore this limit for that day to ensure the student is fully prepared for the imminent exam.
            
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
                    // 3. Persistence: Delete pending tasks for ALL plans we just replanned
                    for (const entry of plansContext) {
                        await deletePendingTasks(userEmail, entry.subject);
                    }

                    // 4. Save all new tasks
                    const tasksToSave = newTasks.map(t => ({ ...t, userEmail }));
                    await saveTasks(userEmail, tasksToSave);

                    // 5. Mark all plans as updated
                    for (const entry of onboardingEntries) {
                        await updateOnboarding(entry.id, userEmail, { lastReplanned: todayStr });
                    }

                    console.log(`[PlanningEngine] Holistic replan complete. ${newTasks.length} tasks saved.`);
                    return { redistributed: true, count: newTasks.length };
                }
            } catch (err) {
                console.error(`[PlanningEngine] Holistic AI Error:`, err.message);
                return { error: err.message };
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
