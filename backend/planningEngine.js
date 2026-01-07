const { getTasks, saveTasks, getUserByEmail, getOnboarding, deletePendingTasks } = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAIKey = process.env.GEMINI_API_KEY || process.env.API_KEY || 'MISSING_KEY';
const genAI = new GoogleGenerativeAI(genAIKey);

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
        const { getOnboarding, updateOnboarding, deletePendingTasks, saveTasks, getUserByEmail, getTasks } = require('./db');
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const user = await getUserByEmail(userEmail);
            const onboardingEntries = await getOnboarding(userEmail); // Get ALL plans

            if (!onboardingEntries || onboardingEntries.length === 0) return { redistributed: false };

            const allTasks = await getTasks(userEmail);
            let totalReplanned = 0;

            console.log(`[PlanningEngine] Checking optimal plan for ${userEmail}. Mood: ${currentMood}`);

            // Iterate through every plan (Exam or Skill)
            for (const entry of onboardingEntries) {
                const plan = entry.onboardingData;
                const planId = entry.id;

                // 1. CHECK "Once Per Day" Rule
                if (entry.lastReplanned === todayStr) {
                    // console.log(`[PlanningEngine] Plan ${planId} (${plan.mode}) already replanned today.`);
                    continue; // Skip without log spam
                }

                console.log(`[PlanningEngine] Processing plan ${planId} (${plan.mode || plan.level})...`);

                // 2. Filter tasks relevant to THIS plan
                // Match by subject. Ensure we default safely if no subject found.
                const planSubject = plan.level || plan.skill || 'General';

                const planTasks = allTasks.filter(t => t.subject === planSubject);
                const missedTasks = planTasks.filter(t => t.status === 'pending' && t.date < todayStr);
                const pendingTasks = planTasks.filter(t => t.status === 'pending' && t.date >= todayStr);
                const completedTasks = planTasks.filter(t => t.status === 'completed');

                const examDate = plan.examDate;
                const dailyHours = user.dailyHours || 4;
                const totalCurrentTasks = pendingTasks.length + missedTasks.length;

                // 3. Prepare AI Prompt
                const moodMap = {
                    'fresh': 'Focus on intense Core Learning and new complex topics. Energy is high.',
                    'calm': 'Steady progress. Balanced mix of learning and moderate practice.',
                    'okay': 'Neutral balance. Follow standard curriculum sequence.',
                    'tired': 'Shift to Reinforcement Revision and light practice. Avoid heavy new theory.',
                    'stressed': 'Focus on Comfort Revision and very easy tasks to build confidence.'
                };

                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const prompt = `You are an agentic study planner. Your goal is to REPLAN a student's schedule for ONE specific goal: "${planSubject}".
                
                CONTEXT:
                - Today's Date: ${todayStr}
                - Goal/Exam Date: ${examDate || 'No deadline'}
                - User's Daily Target: ${dailyHours} hours/day
                - User's Current Mood: ${currentMood.toUpperCase()} (${moodMap[currentMood] || 'Neutral'})
                
                STATUS:
                - Completed Topics: ${completedTasks.map(t => t.subtopic).join(', ')}
                - Unfinished/Missed Topics: ${[...missedTasks, ...pendingTasks].map(t => t.subtopic).join(', ')}
                - Total Unfinished Tasks Count: ${totalCurrentTasks}
                
                RULES:
                1. RE-DISTRIBUTE all unfinished topics starting from ${todayStr}.
                2. MOOD RULE: strictly follow the mood strategy for TODAY (${todayStr}).
                3. STABILITY: You MUST generate EXACTLY ${totalCurrentTasks} tasks unless "Crunch Mode" applies. Do NOT drop topics arbitrarily.
                4. CRUNCH MODE: If today is within 3 days of the Exam (${examDate}), you may drop "Optional" or "Practice" tasks to fit the schedule.
                5. NAMES: Ensure 'topic' and 'subtopic' are specific and descriptive.
                
                OUTPUT:
                Return ONLY a raw JSON array of task objects.
                Format: [{"subject": "${planSubject}", "topic": "Specific Topic Name", "subtopic": "Detailed Subtopic", "duration": "...", "date": "YYYY-MM-DD", "sessionType": "...", "aiExplanation": "...", "status": "pending"}]`;

                try {
                    const result = await model.generateContent(prompt);
                    const responseTxt = result.response.text();
                    const cleanedJson = responseTxt.replace(/```json|```/g, '').trim();
                    const newTasks = JSON.parse(cleanedJson);

                    if (Array.isArray(newTasks) && newTasks.length > 0) {
                        // 4. Persistence
                        // Delete ONLY pending tasks for THIS subject
                        await deletePendingTasks(userEmail, planSubject);

                        // Add userEmail to each new task
                        const tasksToSave = newTasks.map(t => ({ ...t, userEmail }));
                        await saveTasks(userEmail, tasksToSave);

                        // 5. MARK PLAN AS UPDATED
                        await updateOnboarding(entry.id, userEmail, { lastReplanned: todayStr });
                        totalReplanned += newTasks.length;
                        console.log(`[PlanningEngine] Replanned ${newTasks.length} tasks for ${planSubject}.`);
                    }
                } catch (err) {
                    if (err.message && (err.message.includes('429') || err.message.includes('Quota') || err.message.includes('limit'))) {
                        console.warn(`[PlanningEngine] Quota exceeded while replanning ${planSubject}. Skipping for now.`);
                        return { redistributed: totalReplanned > 0, count: totalReplanned, warning: 'Quota Exceeded' };
                    }
                    console.error(`[PlanningEngine] Error replanning for ${planSubject}:`, err);
                }
            }

            return { redistributed: totalReplanned > 0, count: totalReplanned };

        } catch (error) {
            console.error('[PlanningEngine] ensureOptimalPlan AI error:', error);
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
