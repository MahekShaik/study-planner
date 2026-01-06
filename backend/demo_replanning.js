const {
    initializeDatabase,
    createUser,
    createOnboarding,
    saveTasks,
    getTasks,
    getUserByEmail
} = require('./db');
const PlanningEngine = require('./planningEngine');

async function runDemo() {
    console.log("🚀 Starting Intelligent Replanning Terminal Demo...");

    // 1. Initialize
    const dbReady = await initializeDatabase();
    if (!dbReady) {
        console.error("❌ Database initialization failed. Ensure COSMOS_... vars are set.");
        process.exit(1);
    }

    const testEmail = `demo_${Date.now()}@test.com`;
    console.log(`\n👤 Created test user: ${testEmail}`);

    // 2. Setup User Profile
    await createUser(testEmail, "Demo Student", "password123", 4);

    // 3. Setup Onboarding (Exam in 5 days -> Not in Crunch Mode yet)
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 5);
    const examDateStr = examDate.toISOString().split('T')[0];

    await createOnboarding(testEmail, 'exam', {
        level: 'Calculus',
        examDate: examDateStr,
        hoursPerDay: 4,
        syllabus: 'Derivatives, Integrals, Differential Equations'
    });

    // 4. Setup Mock Tasks
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const initialTasks = [
        {
            topic: 'Calculus',
            subtopic: 'Limits & Continuity',
            duration: '1 hr',
            date: dayBefore.toISOString().split('T')[0],
            sessionType: 'Core Learning',
            status: 'completed',
            aiExplanation: 'Foundation'
        },
        {
            topic: 'Calculus',
            subtopic: 'Standard Derivatives',
            duration: '2 hrs',
            date: yesterday.toISOString().split('T')[0],
            sessionType: 'Core Learning',
            status: 'pending', // MISSED!
            aiExplanation: 'Should have finished this yesterday'
        },
        {
            topic: 'Calculus',
            subtopic: 'Chain Rule',
            duration: '1.5 hrs',
            date: tomorrow.toISOString().split('T')[0],
            sessionType: 'Core Learning',
            status: 'pending',
            aiExplanation: 'Scheduled for tomorrow'
        }
    ];

    await saveTasks(testEmail, initialTasks);
    console.log("\n📊 CURRENT STATE (Before Replanning):");
    initialTasks.forEach(t => console.log(` - [${t.status}] ${t.date}: ${t.subtopic} (${t.sessionType})`));

    // 5. Trigger Replanning (Simulate logging mood: 'tired')
    console.log(`\n🧠 AI Replanning Triggered (Condition: Missed task found + Mood is 'tired')...`);
    console.log("Wait for Gemini to re-calculate your path...");

    const result = await PlanningEngine.ensureOptimalPlan(testEmail, 'tired');

    if (result.redistributed) {
        const finalTasks = await getTasks(testEmail);
        console.log("\n✨ AI OPTIMIZED STATE (After Replanning):");

        // Sort by date for display
        finalTasks.sort((a, b) => a.date.localeCompare(b.date));

        finalTasks.forEach(t => {
            const moodIndicator = (t.date === today.toISOString().split('T')[0]) ? "⬅️ TODAY" : "";
            console.log(` - [${t.status}] ${t.date}: ${t.subtopic} (${t.sessionType}) ${moodIndicator}`);
            if (t.aiExplanation.length > 50) {
                console.log(`    💡 AI Note: ${t.aiExplanation.substring(0, 80)}...`);
            } else {
                console.log(`    💡 AI Note: ${t.aiExplanation}`);
            }
        });

        console.log("\n✅ Demo Complete! The AI successfully redistributed the mixed task and adjusted today's session for your 'tired' mood.");
    } else {
        console.log("\n⚠️ Replanning did not occur as expected or AI returned empty.");
    }

    process.exit(0);
}

runDemo();
