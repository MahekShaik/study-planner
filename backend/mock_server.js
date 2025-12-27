const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Mock Data
const MOCK_USER = {
    email: "demo@serenestudy.ai",
    name: "Demo User",
    dailyHours: 4
};

const MOCK_PLAN = {
    mode: 'skill',
    level: 'Beginner',
    skill: 'React',
    skillDuration: 'Week 1',
    planType: 'balanced',
    learningStyle: 'Visual',
    examDate: '2025-12-31'
};

const MOCK_TASKS = [
    {
        id: '1',
        subject: 'React',
        topic: 'Hooks',
        subtopic: 'useEffect',
        duration: '30m',
        sessionType: 'Learning',
        aiExplanation: 'Learn how to handle side effects.',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        quizStatus: 'not_started'
    },
    {
        id: '2',
        subject: 'React',
        topic: 'Components',
        subtopic: 'Props vs State',
        duration: '45m',
        sessionType: 'Revision',
        aiExplanation: 'Review the basics of data flow.',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        quizStatus: 'not_started'
    }
];

// Routes
app.post('/api/auth/login', (req, res) => {
    console.log('Mock Login Request');
    res.json({ token: 'mock-token-123' });
});

app.post('/api/auth/signup', (req, res) => {
    console.log('Mock Signup Request');
    res.json({ token: 'mock-token-123' });
});

app.get('/api/user/profile', (req, res) => {
    console.log('Mock Profile Request');
    res.json(MOCK_USER);
});

app.get('/api/study-plan/active', (req, res) => {
    // Return empty plan initially to trigger onboarding, 
    // or return MOCK_PLAN to show dashboard immediately.
    // Let's mimic a fresh user flow: return empty or null plan
    console.log('Mock Active Plan Request');
    res.json({ plan: null, tasks: [] });
    // Alternatively, to show the dashboard populated:
    // res.json({ plan: MOCK_PLAN, tasks: MOCK_TASKS });
});

app.post('/api/study-plan/generate', (req, res) => {
    console.log('Mock Generate Plan Request', req.body);
    res.json({ plan: { ...req.body }, tasks: MOCK_TASKS });
});

app.post('/api/tasks/:id/progress', (req, res) => {
    console.log(`Mock Update Task ${req.params.id}`, req.body);
    res.json({ ...req.body });
});

app.post('/api/chat', (req, res) => {
    console.log('Mock Chat Request');
    res.json({ response: "I am a mock AI. I can't really think, but I can help you test the UI!" });
});

app.post('/api/learning/content', (req, res) => {
    console.log('Mock Content Request');
    res.json({
        subparts: [
            { title: "Introduction", content: "This is a mock learning module generated for demonstration." },
            { title: "Key Concepts", content: "1. Concept A\n2. Concept B\n3. Concept C" },
            { title: "Summary", content: "You have learned the basics from this mock content." }
        ]
    });
});

app.post('/api/quiz/generate', (req, res) => {
    console.log('Mock Quiz Generation');
    res.json({
        quiz: [
            {
                id: 'q1',
                type: 'mcq',
                question: 'What is a Hook?',
                options: ['A function', 'A class', 'A component'],
                correctAnswer: 'A function'
            },
            {
                id: 'q2',
                type: 'mcq',
                question: 'Which hook manages state?',
                options: ['useEffect', 'useState', 'useContext'],
                correctAnswer: 'useState'
            }
        ]
    });
});

app.post('/api/quiz/evaluate', (req, res) => {
    console.log('Mock Quiz Evaluation');
    res.json({
        score: 100,
        total: 100,
        insight: 'Excellent work!',
        weakSubtopics: [],
        stableSubtopics: ['Hooks Basics'],
        suggestedRevisionTasks: []
    });
});

// Resources Mock
app.post('/api/resources', (req, res) => {
    res.json({
        resources: [
            { title: "React Docs", url: "https://react.dev", type: "website", description: "Official documentation" },
            { title: "Video Tutorial", url: "#", type: "video", description: "A helpful video" }
        ]
    });
});


app.listen(port, () => {
    console.log(`Mock server running at http://localhost:${port}`);
    console.log(`Proxy target for Vite frontend`);
});
