require('dotenv').config();
const appInsights = require('applicationinsights');

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize database on startup
let dbReady = false;
initializeDatabase().then(success => {
  dbReady = success;
  if (success) {
    console.log('Database initialized successfully');
  } else {
    console.error('Database initialization failed - using fallback mode');
  }
});

// Helper for token verification
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch (e) {
    return null;
  }
};

// POST /api/auth/signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, dailyHours } = req.body;
    const existingUser = await getUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser(email, name, hashedPassword, dailyHours || 4);
    console.log('User signed up:', email);
    res.json({ message: 'Signup successful' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Signup failed' });
  }
});

// POST /api/auth/login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) return res.status(401).json({ message: 'Invalid credentials' });
    const token = Buffer.from(JSON.stringify({ email: user.email, name: user.name })).toString('base64');
    console.log('User logged in:', email);
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// GET /api/user/profile - Fetch user profile
app.get('/api/user/profile', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await getUserByEmail(decoded.email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Streak Logic: Check if streak is broken
    const todayStr = new Date().toISOString().split('T')[0];
    const needsMoodCheck = user.lastMoodDate !== todayStr;
    const lastStreakDate = user.lastStreakDate;
    let currentStreak = user.currentStreak || 0;

    // Calculate yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If streak was not updated today AND not updated yesterday, it is broken (unless it's 0 already)
    if (currentStreak > 0 && lastStreakDate !== todayStr && lastStreakDate !== yesterdayStr) {
      console.log(`[Streak Fix] Resetting streak for ${user.email}. Last: ${lastStreakDate}, Yesterday: ${yesterdayStr}`);
      currentStreak = 0;
      // Update DB to reflect broken streak
      await updateUser(decoded.email, { currentStreak: 0 });
    }

    // Log mood status to terminal for visibility
    console.log(`[Mood Status] User: ${user.email}, Current Mood: ${user.currentMood || 'Not set'}, Needs Check: ${needsMoodCheck}`);

    // Return user profile without sensitive data
    res.json({
      email: user.email,
      name: user.name,
      dailyHours: user.dailyHours || 4,
      currentStreak: currentStreak,
      lastStreakDate: user.lastStreakDate || null,
      streakHistory: user.streakHistory || [],
      lastMoodDate: user.lastMoodDate || null,
      currentMood: user.currentMood || null,
      needsMoodCheck
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// POST /api/user/mood - Save user's daily mood
app.post('/api/user/mood', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { mood } = req.body;

    if (!mood) {
      return res.status(400).json({ message: 'Mood is required' });
    }

    const user = await getUserByEmail(decoded.email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if mood was already logged today
    if (user.lastMoodDate === todayStr) {
      return res.status(400).json({ message: 'Mood already logged today' });
    }

    // Update mood history
    const moodHistory = user.moodHistory || [];
    moodHistory.push({
      date: todayStr,
      mood: mood,
      timestamp: new Date().toISOString()
    });

    // Update user with new mood data
    await updateUser(decoded.email, {
      lastMoodDate: todayStr,
      currentMood: mood,
      moodHistory
    });

    console.log(`Mood logged for ${decoded.email}: ${mood}`);

    // Mood-Aware Adjustments: Adjust remaining tasks for today
    await PlanningEngine.adjustTasksForMood(decoded.email, mood);

    res.json({
      message: 'Mood saved successfully',
      mood,
      date: todayStr
    });
  } catch (error) {
    console.error('Save mood error:', error);
    res.status(500).json({ message: 'Failed to save mood' });
  }
});

// GET /api/onboarding - Fetch saved onboarding data
app.get('/api/onboarding', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const data = await getOnboarding(decoded.email);
    res.json(data ? data.map(d => d.onboardingData) : []);
  } catch (error) {
    console.error('Fetch onboarding error:', error);
    res.status(500).json({ message: 'Failed to fetch onboarding data' });
  }
});

// POST /api/onboarding endpoint
app.post('/api/onboarding', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const onboardingData = req.body;
    // Strip heavy files before saving to DB
    const { syllabusFiles, ...savedOnboarding } = onboardingData;
    const todayStr = new Date().toISOString().split('T')[0];
    await createOnboarding(decoded.email, onboardingData.mode, savedOnboarding, { lastReplanned: todayStr });
    console.log('Saved onboarding data for:', decoded.email);
    res.json({ message: "Onboarding data received successfully." });
  } catch (error) {
    console.error('Onboarding save error:', error);
    res.status(500).json({ message: 'Onboarding submission failed' });
  }
});

// GET /api/tasks
app.get('/api/tasks', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const tasks = await getTasks(decoded.email);
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
app.post('/api/tasks', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const tasks = req.body;
    const savedTasks = await saveTasks(decoded.email, tasks);
    res.json(savedTasks);
  } catch (error) {
    console.error('Save tasks error:', error);
    res.status(500).json({ message: 'Failed to save tasks' });
  }
});

// PATCH /api/tasks/:id/progress
app.patch('/api/tasks/:id/progress', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedTask = await updateTaskProgress(id, decoded.email, updates);
    if (updatedTask) {
      res.json(updatedTask);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// Gemini Initialization
const genAIKey = process.env.GEMINI_API_KEY || process.env.API_KEY || 'MISSING_KEY';
console.log("Configured API Key:", genAIKey === 'MISSING_KEY' ? 'MISSING' : (genAIKey.substring(0, 4) + '...'));
const genAI = new GoogleGenerativeAI(genAIKey);
// Direct Gemini integration for syllabus extraction - Make.com integration has been removed.

async function generatePlanFromOnboarding(data, existingPlans = []) {
  const existingPlansSummary = existingPlans.length > 0
    ? existingPlans.map(p => `- ${p.onboardingData.level || p.onboardingData.skill} (Exam: ${p.onboardingData.examDate || 'Self-paced'})`).join('\n')
    : 'None';

  const systemPrompt = `You are a study planning intelligence for a student.
A student is ADDING a new goal. You must generate a plan that fits LONGSIDE their current commitments.

TOTAL DAILY CAPACITY: ${data.hoursPerDay} hours/day.
EXISTING ACTIVE GOALS:
${existingPlansSummary}

NEW GOAL TO ADD:
Mode: ${data.mode}
Subject/Level: ${data.level || data.skill}
Exam/Target Date: ${data.examDate || data.skillDuration}

--------------------------------
PLANNING LOGIC (STRICT)
--------------------------------
2. Time Allocation & Priority:
   - YOU MUST SHARE the ${data.hoursPerDay} daily hours across ALL active goals.
   - PRIORITY: Goals with deadlines < 7 days away should receive ~70% of the total daily time.
   - AVAILABILITY: The total load per day should not exceed ${data.hoursPerDay} hours, UNLESS this new goal (or an existing one) is in "Crunch Mode" (deadline < 3 days), in which case availability can be exceeded to ensure readiness.
   - Session durations: 45-90 mins per session.
4. Output Format: Return EXACTLY a JSON array of task objects.

--------------------------------
OUTPUT FORMAT (JSON ARRAY)
--------------------------------
Return EXACTLY a JSON array of session objects. 
Each object must have:
- subject: string (MUST match input "${data.level}" or "${data.skill}" exactly)
- topic: string
- subtopic: string
- duration: string (e.g., "45 mins")
- date: string (YYYY-MM-DD)
- sessionType: string (e.g. "Core Learning", "Practice", "Active Revision")
- aiExplanation: string (How this session fits into the student's busy schedule)
- status: "pending"
`;

  const userPrompt = data.mode === 'exam'
    ? `Today is ${new Date().toISOString().split('T')[0]}. Subject: ${data.level}. Total Syllabus: ${data.syllabus}. Exam Date: ${data.examDate}. Daily Hours: ${data.hoursPerDay}. 
       Plan tasks from today until ${data.examDate}. Focus on meaningful progression.`
    : `Today is ${new Date().toISOString().split('T')[0]}. Skill: ${data.skill}. Target Duration: ${data.skillDuration}. Level: ${data.level}. Daily commitment: ${data.hoursPerDay} hours.
       Plan starting from today.`;

  try {
    let contents = [{ role: "user", parts: [{ text: `${systemPrompt}\n\nINPUT:\n${userPrompt}` }] }];

    if (data.syllabusFiles && Array.isArray(data.syllabusFiles) && data.syllabusFiles.length > 0) {
      data.syllabusFiles.forEach(file => {
        if (file.data && file.type) {
          contents[0].parts.push({
            inlineData: {
              data: file.data,
              mimeType: file.type
            }
          });
        }
      });
      contents[0].parts.push({ text: "\n[IMPORTANT] Use the uploaded syllabus documents above to extract specific topics, modules, and learning objectives. Then, structure the study plan accurately based on this extracted material." });
    }

    const text = await callGeminiWithRetry({
      contents,
      generationConfig: { responseMimeType: "application/json" },
      source: 'Plan Generation'
    });

    const generatedTasks = parseGeminiJson(text);

    // Validate generated tasks
    if (!Array.isArray(generatedTasks) || generatedTasks.length === 0) {
      throw new Error('Generated tasks array is empty or invalid');
    }

    // Validate each task has required fields
    const requiredFields = ['subject', 'topic', 'subtopic', 'duration', 'date', 'sessionType'];
    for (const task of generatedTasks) {
      for (const field of requiredFields) {
        if (!task[field]) {
          throw new Error(`Task missing required field: ${field}`);
        }
      }
    }

    console.log(`Successfully generated ${generatedTasks.length} tasks`);
    return generatedTasks;
  } catch (e) {
    throw new Error(`Failed to generate study plan: ${e.message}`);
  }
}

// GET /api/study-plan/active
app.get('/api/study-plan/active', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const onboardingEntries = await getOnboarding(decoded.email);
    if (!onboardingEntries || onboardingEntries.length === 0) {
      return res.json({ plans: [], tasks: [] });
    }

    const today = new Date().toISOString().split('T')[0];

    // Filter out expired plans (exams that already happened)
    const activePlans = onboardingEntries.filter(entry => {
      const plan = entry.onboardingData;
      if (plan.mode === 'exam' && plan.examDate) {
        return plan.examDate >= today;
      }
      return true; // Skills/others don't expire for now
    }).map(entry => entry.onboardingData);

    if (activePlans.length === 0) {
      return res.json({ plans: [], tasks: [] });
    }

    // Get user's current mood for the replanner
    const user = await getUserByEmail(decoded.email);
    const currentMood = user ? user.currentMood : 'okay';

    // 1. Holistic automatic replanning
    await PlanningEngine.ensureOptimalPlan(decoded.email, currentMood);

    // 2. Fetch all tasks and filter for any of the active plan subjects
    const allTasks = await getTasks(decoded.email);
    const validSubjectKeywords = activePlans.flatMap(p => [p.level, p.skill].filter(Boolean).map(s => s.toLowerCase()));

    const filteredTasks = allTasks.filter(t => {
      if (!t.subject) return false;
      const taskSubject = t.subject.toLowerCase();
      return validSubjectKeywords.some(kw => taskSubject.includes(kw) || kw.includes(taskSubject));
    });

    console.log(`Active Plans: Found ${activePlans.length} plans and ${filteredTasks.length} tasks for user ${decoded.email}`);

    // Maintain backward compatibility by still providing 'plan' (as the first one)
    res.json({
      plans: activePlans,
      plan: activePlans[0],
      tasks: filteredTasks
    });
  } catch (error) {
    console.error('Fetch active plan error:', error);
    res.status(500).json({ message: 'Failed to fetch active study plan' });
  }
});

// POST /api/study-plan/generate
app.post('/api/study-plan/generate', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const onboardingData = req.body;

    console.log(`Starting study plan generation for ${decoded.email}...`);

    // 0. Fetch existing plans for context
    const existingPlans = await getOnboarding(decoded.email);
    const activeExistingPlans = (existingPlans || []).filter(p => {
      if (p.onboardingData.mode === 'exam' && p.onboardingData.examDate) {
        return p.onboardingData.examDate >= new Date().toISOString().split('T')[0];
      }
      return true;
    });

    // 1. Generate tasks using AI (with context of existing plans)
    const generatedTasks = await generatePlanFromOnboarding(onboardingData, activeExistingPlans);

    // 2. Validate tasks are non-empty before persisting
    if (!generatedTasks || generatedTasks.length === 0) {
      throw new Error('Task generation returned empty array');
    }

    // 3. Apply Spaced Repetition (1-4-7 Rule) if time allows
    const optimizedTasks = await PlanningEngine.applySpacedRepetition(generatedTasks, onboardingData.examDate);

    console.log(`Generated ${generatedTasks.length} tasks (Optimized to ${optimizedTasks.length}), now persisting...`);

    // 4. Save generated tasks first
    const savedTasks = await saveTasks(decoded.email, optimizedTasks);

    // 4. Only save onboarding data after tasks are successfully saved
    // Strip heavy document data before saving
    const { syllabusFiles, ...savedOnboarding } = onboardingData;
    const todayStr = new Date().toISOString().split('T')[0];
    await createOnboarding(decoded.email, onboardingData.mode, savedOnboarding, { lastReplanned: todayStr });

    console.log(`Successfully generated and saved study plan for ${decoded.email}: ${savedTasks.length} tasks`);
    res.json({ plan: savedOnboarding, tasks: savedTasks });
  } catch (error) {
    console.error('Plan generation error:', error.message);

    // Log error but don't crash server
    const fs = require('fs');
    const errorLog = `[${new Date().toISOString()}] Plan Generation Error:\n${error.toString()}\n${error.stack || ''}\n\n`;
    fs.appendFileSync('last_error.txt', errorLog);

    res.status(500).json({
      message: 'Study plan generation failed',
      error: error.message
    });
  }
});

// POST /api/chat & /api/explain - Handle explanation/chat requests
const handleChatRequest = async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const systemInstruction = `You are a supportive, calm study tutor for Adapta.
A student is feeling stuck on a topic and needs help understanding concepts.

RULES:
- Explain concepts simply and clearly
- Provide helpful analogies when appropriate
- Be encouraging and supportive
- Avoid complex jargon unless necessary
- Keep responses focused and concise
- No emojis or overly casual language
- No mentions of AI or automation`;

    const text = await callGeminiWithRetry({
      contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nStudent question: ${message}` }] }],
      source: 'Chat Request'
    });

    res.json({ response: text });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to generate explanation',
      error: error.message
    });
  }
};

app.post('/api/chat', handleChatRequest);
app.post('/api/explain', handleChatRequest);

// POST /api/quiz/generate
app.post('/api/quiz/generate', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { subject, topic } = req.body;
    const systemInstruction = `You are a learning assistant for Adapta.
Generate a conceptual and application-based quiz based ONLY on the topic "${topic}" in "${subject}".
- Calm, tutor-like tone. No emojis.
- Match difficulty to exam standards.
- Include 5 MCQ and 1 short-answer diagnostic question.
- No answers should be shown immediately to the user.
- MANDATORY: Every question MUST have an "explanation" field (minimum 2 sentences) explaining the concept and why the correctAnswer is right.
- STRICTLY return a JSON array of objects with this structure:
  [
    {
      "id": "1",
      "type": "mcq",
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B",
      "explanation": "Briefly explain why this answer is correct."
    },
    ...
  ]
- Ensure "question" field contains the question text.
- For short answer, "options" can be empty or omitted.
`;

    const text = await callGeminiWithRetry({
      contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
      generationConfig: { responseMimeType: "application/json" },
      source: 'Quiz Generation'
    });

    const quiz = parseGeminiJson(text);
    res.json({ quiz });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ message: 'Failed to generate quiz', error: error.message });
  }
});

// POST /api/quiz/evaluate
app.post('/api/quiz/evaluate', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { subject, topic, questions, responses, examDate } = req.body;
    const today = new Date();
    const exam = examDate ? new Date(examDate) : null;
    let proximity = 'Normal';

    if (exam) {
      const diffDays = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) proximity = 'Tomorrow';
      else if (diffDays <= 7) proximity = 'Approaching';
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().split('T')[0];

    const systemInstruction = `You are a learning evaluation manager for Adapta.
EVALUATE this quiz attempt for "${topic}" in "${subject}".

INPUT:
Questions: ${JSON.stringify(questions)}
Responses: ${JSON.stringify(responses)}
Proximity: ${proximity}

MANDATORY: Calculate score honestly
RULES:
1. Calculate Score Honestly: The "score" field must be the EXACT number of correct answers based on the student's Responses. DO NOT inflate the score.
2. Identify Weak Subtopics: Where answers were incorrect or showed gaps.
3. Identify Stable Subtopics: Where student was consistently correct.
4. Supportive Feedback: While being honest about the score, keep the language supportive and use mistakes as learning signals.
5. Targeted Revision: Suggest short, specific revision tasks ONLY for weak subtopics for ${tomorrowISO}.
6. Return JSON object with this EXACT structure:
{
  "score": number, // MUST match the actual number of correct answers
  "total": number, // Total number of questions
  "insight": "string", // Encouraging feedback summary appropriate for the score
  "weakSubtopics": ["string"],
  "stableSubtopics": ["string"],
  "suggestedRevisionTasks": [] // Optional array of tasks
}

TONE: supportive, honest, exam-focused. No emojis. No AI mentions.`;

    const text = await callGeminiWithRetry({
      contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
      generationConfig: { responseMimeType: "application/json" },
      source: 'Quiz Evaluation'
    });

    const evaluation = parseGeminiJson(text);

    // Streak Logic
    console.log(`[Streak Debug] Score: ${evaluation.score}, Total: ${evaluation.total}, Threshold: ${evaluation.total / 2}`);
    if (evaluation.score > (evaluation.total / 2)) {
      const user = await getUserByEmail(decoded.email);
      console.log(`[Streak Debug] User found: ${!!user}, LastStreak: ${user?.lastStreakDate}, Current: ${user?.currentStreak}`);

      if (user) {
        const todayStr = new Date().toISOString().split('T')[0];
        const lastStreakDate = user.lastStreakDate; // YYYY-MM-DD
        let currentStreak = user.currentStreak || 0;

        if (lastStreakDate === todayStr) {
          console.log('[Streak Debug] Already maintained today');
        } else {
          // Calculate yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          console.log(`[Streak Debug] Yesterday was: ${yesterdayStr}`);

          if (lastStreakDate === yesterdayStr) {
            currentStreak += 1;
          } else {
            currentStreak = 1;
          }
          console.log(`[Streak Debug] New streak will be: ${currentStreak}`);

          const streakHistory = user.streakHistory || [];
          if (!streakHistory.includes(todayStr)) {
            streakHistory.push(todayStr);
          }

          await updateUser(decoded.email, {
            currentStreak,
            lastStreakDate: todayStr,
            streakHistory
          });
          console.log('[Streak Debug] User updated in DB');

          // Attach streak info to response for frontend celebration
          evaluation.streakUpdate = {
            newStreak: currentStreak,
            message: "Streak maintained!"
          };
        }
      }
    } else {
      console.log('[Streak Debug] Score not high enough for streak');
    }

    // Performance-Based Replanning: Mark topic as weak if score is low (<= 50%)
    if (evaluation.score <= (evaluation.total / 2)) {
      await PlanningEngine.markTopicAsWeak(decoded.email, topic);
    }

    // Persist result for insights
    await saveQuizResult(decoded.email, {
      subject,
      topic,
      score: evaluation.score,
      total: evaluation.total,
      weakSubtopics: evaluation.weakSubtopics,
      stableSubtopics: evaluation.stableSubtopics
    });

    res.json(evaluation);
  } catch (error) {
    console.error('Quiz evaluation error:', error);
    res.status(500).json({ message: 'Failed to evaluate quiz', error: error.message });
  }
});

// POST /api/resources
app.post('/api/resources', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { topic, subject } = req.body;

    // User requested "Proper YT videos"
    // topic is now being passed as subtopic from the frontend for better precision
    const searchQuery = `${topic} ${subject} tutorial`;
    console.log(`Searching YouTube for: ${searchQuery}`);

    try {
      const yts = require('yt-search');
      const searchResults = await yts(searchQuery);

      const resources = searchResults.videos.slice(0, 6).map(video => ({
        title: video.title,
        url: video.url, // Direct Watch URL: https://youtube.com/watch/v=...
        type: 'video',
        description: video.description || `Watch ${video.title} on YouTube.`,
        thumbnail: video.thumbnail,
        duration: video.timestamp,
        views: `${video.views} views`
      }));

      console.log(`Found ${resources.length} videos`);
      res.json({ resources });
    } catch (searchError) {
      console.error('YouTube Search Error:', searchError);
      // Fallback only if library fails completely
      const encodedTopic = encodeURIComponent(`${topic} ${subject}`);
      res.json({
        resources: [
          {
            title: `YouTube Search: ${topic}`,
            url: `https://www.youtube.com/results?search_query=${encodedTopic}+tutorial`,
            type: 'video',
            description: `Search results for ${topic} on YouTube.`,
          }
        ]
      });
    }
  } catch (error) {
    console.error('Resources error:', error);
    res.json({ resources: [] });
  }
});

// POST /api/learning/content
app.post('/api/learning/content', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { subject, topic, level, examDate, learningStyle, sessionType } = req.body;
    const today = new Date();
    const exam = examDate ? new Date(examDate) : null;
    let proximity = 'Normal';

    if (exam) {
      const diffDays = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) proximity = 'Tomorrow';
      else if (diffDays <= 7) proximity = 'Approaching';
    }

    // Simplified: always use Gemini for all session types

    let systemInstruction = `You are a personalized learning assistant for Adapta. Help students study for exams.
STRICT RULES:
- Calm, tutor-like tone. No emojis.
- Proximity: ${proximity}. Level: ${level}. Learning Style: ${learningStyle}.
- TASK: Break "${topic}" in "${subject}" into logical subtopics and provide content for each. 
- Return JSON object with "subparts" array.`;

    const text = await callGeminiWithRetry({
      contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
      generationConfig: { responseMimeType: "application/json" },
      source: 'Learning Content Generation'
    });

    const content = parseGeminiJson(text);
    res.json(content);
  } catch (error) {
    console.error('Learning content error:', error.message);
    res.status(500).json({ message: 'Failed to generate learning content', error: error.message });
  }
});

// GET /api/insights
app.get('/api/insights', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const [user, tasks, quizResults] = await Promise.all([
      getUserByEmail(decoded.email),
      getTasks(decoded.email),
      getQuizResults(decoded.email)
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const insights = await generatePersonalizedInsights({
      name: user.name,
      currentMood: user.currentMood || 'okay',
      tasks,
      quizResults
    });

    res.json({ insights });
  } catch (error) {
    console.error('Insights endpoint error:', error.message);
    res.status(500).json({ message: 'Failed to generate insights', error: error.message });
  }
});


// Initialize and Start Server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Adapta backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
