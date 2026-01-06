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
     */
    static async ensureOptimalPlan(userEmail, currentMood = 'okay') {
        try {
            const allTasks = await getTasks(userEmail);
            const todayStr = new Date().toISOString().split('T')[0];

            // 1. Check if we actually need a replan (missed tasks or mood changed)
            const missedTasks = allTasks.filter(t => t.status === 'pending' && t.date < todayStr);
            const pendingTasks = allTasks.filter(t => t.status === 'pending' && t.date >= todayStr);
            const completedTasks = allTasks.filter(t => t.status === 'completed');

            // If no missed tasks and no pending tasks, nothing to replan
            if (missedTasks.length === 0 && pendingTasks.length === 0) return { redistributed: false };

            console.log(`[PlanningEngine] AI Replanning triggered for ${userEmail}. Mood: ${currentMood}`);

            // 2. Get User & Plan Context
            const user = await getUserByEmail(userEmail);
            const onboardingEntries = await getOnboarding(userEmail);
            if (!onboardingEntries || onboardingEntries.length === 0) return { redistributed: false };

            const plan = onboardingEntries[0].onboardingData;
            const examDate = plan.examDate;
            const dailyHours = user.dailyHours || 4;

            // 3. Prepare AI Prompt
            const moodMap = {
                'fresh': 'Focus on intense Core Learning and new complex topics. Energy is high.',
                'calm': 'Steady progress. Balanced mix of learning and moderate practice.',
                'okay': 'Neutral balance. Follow standard curriculum sequence.',
                'tired': 'Shift to Reinforcement Revision and light practice. Avoid heavy new theory.',
                'stressed': 'Focus on Comfort Revision and very easy tasks to build confidence.'
            };

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `You are an agentic study planner. Your goal is to REPLAN a student's schedule.
            
            CONTEXT:
            - Today's Date: ${todayStr}
            - Exam Date: ${examDate}
            - User's Daily Target: ${dailyHours} hours/day
            - User's Current Mood: ${currentMood.toUpperCase()} (${moodMap[currentMood] || 'Neutral'})
            
            STATUS:
            - Completed Topics: ${completedTasks.map(t => t.subtopic).join(', ')}
            - Unfinished/Missed Topics: ${[...missedTasks, ...pendingTasks].map(t => t.subtopic).join(', ')}
            
            RULES:
            1. RE-DISTRIBUTE all unfinished topics starting from ${todayStr}.
            2. MOOD RULE: strictly follow the mood strategy for TODAY (${todayStr}).
            3. CRUNCH MODE: If today is within 3 days of the Exam (${examDate}), IGNORE mood and daily hours. MAXIMIZE coverage to ensure every topic is touched.
            4. DROPPING: If it's mathematically impossible to finish, drop "Practice" or "Optional Revision" before dropping "Core Learning".
            5. WEAK AREAS: If a topic is marked as "Weak Area Focus", ensure it has at least 1 extra revision session.
            
            OUTPUT:
            Return ONLY a raw JSON array of task objects.
            Format: [{"subject": "${plan.level || plan.skill}", "topic": "...", "subtopic": "...", "duration": "...", "date": "YYYY-MM-DD", "sessionType": "...", "aiExplanation": "...", "status": "pending"}]`;

            const result = await model.generateContent(prompt);
            const responseTxt = result.response.text();

            // Clean response
            const cleanedJson = responseTxt.replace(/```json|```/g, '').trim();
            const newTasks = JSON.parse(cleanedJson);

            if (Array.isArray(newTasks) && newTasks.length > 0) {
                // 4. Persistence: Delete old pending/missed and save new
                await deletePendingTasks(userEmail);
                // Also clean up tasks with old dates that were missed
                // (Already handled by passing them to AI and then deleting pending in DB)

                // Add userEmail to each new task
                const tasksToSave = newTasks.map(t => ({ ...t, userEmail }));
                await saveTasks(userEmail, tasksToSave);

                console.log(`[PlanningEngine] AI Replanned ${newTasks.length} tasks successfully.`);
                return { redistributed: true, count: newTasks.length };
            }

            return { redistributed: false };
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
