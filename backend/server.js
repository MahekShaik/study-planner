require('dotenv').config();

/* ================================
   Application Insights (Optional)
================================ */
const appInsights = require('applicationinsights');

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights
    .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .start();

  console.log('Azure Application Insights initialized');
}

/* ================================
   Imports
================================ */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

const {
  initializeDatabase,
  createUser,
  getUserByEmail,
  createOnboarding,
  getOnboarding,
  saveTasks,
  getTasks,
  updateTaskProgress,
  updateUser,
  saveQuizResult,
  getQuizResults
} = require('./db');

const PlanningEngine = require('./planningEngine');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { callGeminiWithRetry, parseGeminiJson } = require('./geminiUtils');
const { generatePersonalizedInsights } = require('./groqUtils');

/* ================================
   App Setup
================================ */
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ================================
   ✅ ROOT HEALTH ROUTE (IMPORTANT)
================================ */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Adapta AI backend is running 🚀'
  });
});

/* ================================
   Auth Token Helper
================================ */
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    return JSON.parse(
      Buffer.from(authHeader.substring(7), 'base64').toString()
    );
  } catch {
    return null;
  }
};

/* ================================
   AUTH ROUTES
================================ */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, dailyHours } = req.body;
    if (await getUserByEmail(email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser(email, name, hashedPassword, dailyHours || 4);
    res.json({ message: 'Signup successful' });
  } catch (err) {
    res.status(500).json({ message: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = Buffer.from(
      JSON.stringify({ email: user.email, name: user.name })
    ).toString('base64');

    res.json({ token });
  } catch {
    res.status(500).json({ message: 'Login failed' });
  }
});

/* ================================
   USER PROFILE
================================ */
app.get('/api/user/profile', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await getUserByEmail(decoded.email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let currentStreak = user.currentStreak || 0;
    if (
      currentStreak > 0 &&
      user.lastStreakDate !== today &&
      user.lastStreakDate !== yesterday
    ) {
      currentStreak = 0;
      await updateUser(decoded.email, { currentStreak: 0 });
    }

    res.json({
      email: user.email,
      name: user.name,
      dailyHours: user.dailyHours || 4,
      currentStreak,
      lastStreakDate: user.lastStreakDate || null,
      lastMoodDate: user.lastMoodDate || null,
      currentMood: user.currentMood || null,
      needsMoodCheck: user.lastMoodDate !== today
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

/* ================================
   TASKS
================================ */
app.get('/api/tasks', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  res.json(await getTasks(decoded.email));
});

app.post('/api/tasks', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  res.json(await saveTasks(decoded.email, req.body));
});

app.patch('/api/tasks/:id/progress', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  const task = await updateTaskProgress(req.params.id, decoded.email, req.body);
  task ? res.json(task) : res.status(404).json({ message: 'Task not found' });
});

/* ================================
   INSIGHTS
================================ */
app.get('/api/insights', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  const [user, tasks, quizResults] = await Promise.all([
    getUserByEmail(decoded.email),
    getTasks(decoded.email),
    getQuizResults(decoded.email)
  ]);

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({
    insights: await generatePersonalizedInsights({
      name: user.name,
      currentMood: user.currentMood || 'okay',
      tasks,
      quizResults
    })
  });
});

/* ================================
   SERVER START
================================ */
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Adapta backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database init failed:', err);
    process.exit(1);
  });
