require('dotenv').config();
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
  updateUser
} = require('./db');
const PlanningEngine = require('./planningEngine');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

    // Calculate if user needs to log mood today
    const todayStr = new Date().toISOString().split('T')[0];
    const needsMoodCheck = user.lastMoodDate !== todayStr;

    // Log mood status to terminal for visibility
    console.log(`[Mood Status] User: ${user.email}, Current Mood: ${user.currentMood || 'Not set'}, Needs Check: ${needsMoodCheck}`);

    // Return user profile without sensitive data
    res.json({
      email: user.email,
      name: user.name,
      dailyHours: user.dailyHours || 4,
      currentStreak: user.currentStreak || 0,
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
    await createOnboarding(decoded.email, onboardingData.mode, onboardingData);
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

async function generatePlanFromOnboarding(data, retryCount = 0) {
  const MAX_RETRIES = 2;
  const systemPrompt = `You are a study planning intelligence for a student exam preparation application.
Your task is to transform exam preparation inputs into a structured daily study plan.

TODAY'S DATE: ${new Date().toISOString().split('T')[0]} (Use this as the starting point for the plan)

--------------------------------
PLANNING LOGIC (STRICT)
--------------------------------
1. Syllabus Breakdown: Break the syllabus into main topics and then clear subtopics. Ensure no subtopic is skipped.
2. Time Allocation (${data.planType} Mode): 
   - Daily hours: ${data.hoursPerDay} hrs/day.
   - Split daily time into: 70% new learning, 30% revision.
   - Ensure earlier topics are revised multiple times before exam.
3. Daily Session Generation: Assign subtopics to specific days (YYYY-MM-DD). Start from today. Each day must have study sessions.
4. Exam Proximity Rule: As exam date (${data.examDate}) approaches, reduce new topics and increase revision. If the exam is very soon (e.g. 3 days away), focus heavily on high-yield revision and practice.

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
- sessionType: string (e.g. "Core Learning", "Practice", "Active Revision", "Weak Area Focus")
- aiExplanation: string (Brief reasoning why this session is important for the exam on ${data.examDate})
- status: "pending"

Example: [{"subject": "Math", "topic": "Algebra", "subtopic": "Linear Equations", "duration": "1 hr", "date": "2025-12-23", "sessionType": "Core Learning", "aiExplanation": "Starting with foundations to build momentum...", "status": "pending"}]
DO NOT include any Markdown formatting or keys like "tasks" or "plan". Just the array.`;

  const userPrompt = data.mode === 'exam'
    ? `Today is ${new Date().toISOString().split('T')[0]}. Subject: ${data.level}. Total Syllabus: ${data.syllabus}. Exam Date: ${data.examDate}. Daily Hours: ${data.hoursPerDay}. 
       Plan tasks from today until ${data.examDate}. Focus on meaningful progression.`
    : `Today is ${new Date().toISOString().split('T')[0]}. Skill: ${data.skill}. Target Duration: ${data.skillDuration}. Level: ${data.level}. Daily commitment: ${data.hoursPerDay} hours.
       Plan starting from today.`;

  try {
    console.log(`Calling Gemini API (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

    let parts = [{ text: `${systemPrompt}\n\nINPUT:\n${userPrompt}` }];

    if (data.syllabusFiles && Array.isArray(data.syllabusFiles) && data.syllabusFiles.length > 0) {
      console.log(`Attaching ${data.syllabusFiles.length} syllabus files directly to Gemini for extraction and planning...`);
      data.syllabusFiles.forEach(file => {
        if (file.data && file.type) {
          parts.push({
            inlineData: {
              data: file.data,
              mimeType: file.type
            }
          });
        }
      });
      parts.push({ text: "\n[IMPORTANT] Use the uploaded syllabus documents above to extract specific topics, modules, and learning objectives. Then, structure the study plan accurately based on this extracted material." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: parts }]
    });


    // Parse the response - handle different response structures
    let text;
    if (typeof result.text === 'function') {
      text = result.text();
    } else if (result.text) {
      text = result.text;
    } else if (result.response && typeof result.response.text === 'function') {
      text = result.response.text();
    } else if (result.response && result.response.text) {
      text = result.response.text;
    } else {
      text = JSON.stringify(result);
    }
    console.log("Raw Gemini Response:", text.substring(0, 500) + "...");

    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    }

    const generatedTasks = JSON.parse(jsonString);

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
    console.error(`Gemini API Error (attempt ${retryCount + 1}):`, e.message);

    // Retry logic for transient errors
    if (retryCount < MAX_RETRIES && (e.message.includes('quota') || e.message.includes('rate limit') || e.message.includes('timeout'))) {
      const waitTime = (retryCount + 1) * 2000; // 2s, 4s
      console.log(`Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return generatePlanFromOnboarding(data, retryCount + 1);
    }

    // Log error details but don't crash
    const fs = require('fs');
    const errorLog = `[${new Date().toISOString()}] Gemini API Error:\n${e.toString()}\n${e.stack || ''}\n\n`;
    fs.appendFileSync('server_error.log', errorLog);

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
      return res.json({ plan: null, tasks: [] });
    }

    const latestPlan = onboardingEntries[0].onboardingData;

    // Get user's current mood for the replanner
    const user = await getUserByEmail(decoded.email);
    const currentMood = user ? user.currentMood : 'okay';

    // 1. Silent automatic replanning for missed days or mood shifts
    await PlanningEngine.ensureOptimalPlan(decoded.email, currentMood);

    // 2. Refresh tasks after potential redistribution
    const planTasks = await (async () => {
      const allTasks = await getTasks(decoded.email);
      const validSubjects = [latestPlan.level, latestPlan.skill].filter(Boolean).map(s => s.toLowerCase());
      return allTasks.filter(t => {
        if (!t.subject) return false;
        const taskSubject = t.subject.toLowerCase();
        return validSubjects.some(s => taskSubject.includes(s) || s.includes(taskSubject));
      });
    })();

    console.log(`Active Plan: Found ${planTasks.length} tasks for user ${decoded.email}`);
    res.json({ plan: latestPlan, tasks: planTasks });
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

    // 1. Generate tasks using AI (with retry logic built-in)
    const generatedTasks = await generatePlanFromOnboarding(onboardingData);

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
    // 4. Only save onboarding data after tasks are successfully saved
    // Strip heavy document data before saving
    const { documentData, mimeType, ...savedOnboarding } = onboardingData;
    await createOnboarding(decoded.email, onboardingData.mode, savedOnboarding);

    console.log(`Successfully generated and saved study plan for ${decoded.email}: ${savedTasks.length} tasks`);
    res.json({ plan: onboardingData, tasks: savedTasks });
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

    console.log(`[${new Date().toISOString()}] Chat request from ${decoded.email}: ${message.substring(0, 50)}...`);

    const systemInstruction = `You are a supportive, calm study tutor for SereneStudy. 
A student is feeling stuck on a topic and needs help understanding concepts.

RULES:
- Explain concepts simply and clearly
- Provide helpful analogies when appropriate
- Be encouraging and supportive
- Avoid complex jargon unless necessary
- Keep responses focused and concise
- No emojis or overly casual language
- No mentions of AI or automation`;

    // Requirement: Use stable flash model
    // Note: gemini-1.5-flash is not found in this environment; using gemini-2.5-flash which is stable here.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: `${systemInstruction}\n\nStudent question: ${message}` }] }
      ]
    });

    // Parse the response
    let text;
    if (typeof result.text === 'function') {
      text = result.text();
    } else if (result.text) {
      text = result.text;
    } else if (result.response && typeof result.response.text === 'function') {
      text = result.response.text();
    } else if (result.response && result.response.text) {
      text = result.response.text;
    } else {
      throw new Error('Unable to extract text from Gemini response');
    }

    console.log(`[${new Date().toISOString()}] Chat response generated successfully (${text.length} chars)`);
    res.json({ response: text });

  } catch (error) {
    // Requirement: Clear error logging for Gemini failures
    console.error(`[${new Date().toISOString()}] Chat API Error:`, error.message);

    // Log error details to file
    const fs = require('fs');
    const errorLog = `[${new Date().toISOString()}] Chat API Error:\n${error.toString()}\n${error.stack || ''}\n\n`;
    fs.appendFileSync('server_error.log', errorLog);

    // Requirement: Return a proper JSON error response instead of crashing
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
    const systemInstruction = `You are a learning assistant for SereneStudy. 
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

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemInstruction }] }]
    });

    let text = result.text ? (typeof result.text === 'function' ? result.text() : result.text) : (result.response ? result.response.text() : JSON.stringify(result));

    // Clean JSON string
    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    }

    const quiz = JSON.parse(jsonString);
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

    const systemInstruction = `You are a learning evaluation manager for SereneStudy.
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

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemInstruction }] }]
    });

    let text = result.text ? (typeof result.text === 'function' ? result.text() : result.text) : (result.response ? result.response.text() : JSON.stringify(result));

    // Clean JSON string
    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    const evaluation = JSON.parse(jsonString);

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

    // Performance-Based Replanning: Mark topic as weak if score is low (< 60%)
    if (evaluation.score < (evaluation.total * 0.6)) {
      await PlanningEngine.markTopicAsWeak(decoded.email, topic);
    }

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
    const systemInstruction = `Find 3 high-quality educational resources for the topic "${topic}" in "${subject}". Provide YouTube links or reputable educational websites. Return as JSON array of objects with title, url, type, description.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemInstruction }] }]
    });

    let text = result.text ? (typeof result.text === 'function' ? result.text() : result.text) : (result.response ? result.response.text() : JSON.stringify(result));

    // Clean JSON string
    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    }

    const resources = JSON.parse(jsonString);
    res.json({ resources });
  } catch (error) {
    console.error('Resources error:', error);
    res.status(500).json({ message: 'Failed to fetch resources', error: error.message });
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

    // Branch for Revision sessions
    const isRevision = sessionType && (
      sessionType.includes('Revision') ||
      sessionType.includes('Practice') ||
      sessionType.includes('Focus')
    );

    if (isRevision) {
      try {
        const content = await generateRevisionWithAzureOpenAI(subject, topic, level, examDate, learningStyle, proximity);
        return res.json(content);
      } catch (azureError) {
        console.error('Azure OpenAI failed, falling back to Gemini:', azureError.message);
        // Fallback to Gemini below
      }
    }

    let systemInstruction = `You are a personalized learning assistant for SereneStudy. Help students study for exams.
STRICT RULES:
- Calm, tutor-like tone. No emojis.
- Proximity: ${proximity}. Level: ${level}. Learning Style: ${learningStyle}.
- TASK: Break "${topic}" in "${subject}" into logical subtopics and provide content for each. 
- Return JSON object with "subparts" array.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemInstruction }] }]
    });

    let text = result.text ? (typeof result.text === 'function' ? result.text() : result.text) : (result.response ? result.response.text() : JSON.stringify(result));

    // Clean JSON string
    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    const content = JSON.parse(jsonString);
    res.json(content);
  } catch (error) {
    console.error('Learning content error:', error.message);
    res.status(500).json({ message: 'Failed to generate learning content', error: error.message });
  }
});

// Helper for Azure OpenAI Revision Content
async function generateRevisionWithAzureOpenAI(subject, topic, level, examDate, learningStyle, proximity) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  if (!endpoint || !key || !deployment || key === 'your-azure-key') {
    throw new Error('Azure OpenAI credentials missing. Please configure AZURE_OPENAI_KEY and ENDPOINT in .env');
  }

  const systemPrompt = `You are an exam revision assistant for SereneStudy. 
Your job is to generate concise, high-yield revision content for "${topic}" in "${subject}".

RULES:
- Assume the student is close to exam day.
- Focus on formulas, definitions, and common mistakes.
- Avoid long explanations.
- No motivation, no emojis, no AI mentions.
- Output must be structured and skimmable.
- Proximity: ${proximity}. Level: ${level}. Learning Style: ${learningStyle}.

TASK:
1. Provide a breakdown of the topic into subparts.
2. For each subpart, include: Key concepts, Must-remember formulas, Typical exam traps.
3. The final subpart must be "Rapid-Fire Check" containing 5 quick revision questions.

Return JSON object with "subparts" array [ { "title": "...", "content": "..." } ].`;

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': key
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a professional exam revision assistant. Return pure JSON.' },
        { role: 'user', content: systemPrompt }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Azure OpenAI Error: ${err.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const rawContent = result.choices[0].message.content;

  let jsonString = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBrace = jsonString.indexOf('{');
  const lastBrace = jsonString.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(jsonString);
}

// Initialize and Start Server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SereneStudy backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
