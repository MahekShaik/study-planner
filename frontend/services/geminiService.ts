
import { QuizQuestion, QuizResult, StudyResource, StudyTask, OnboardingData } from "../types";

const getAuthToken = () => localStorage.getItem('authToken');

const apiFetch = async (endpoint: string, options: any = {}) => {
  const token = getAuthToken();
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }

  return res.json();
};

export const generateQuiz = async (subject: string, topic: string): Promise<QuizQuestion[]> => {
  const data = await apiFetch('/api/quiz/generate', {
    method: 'POST',
    body: JSON.stringify({ subject, topic })
  });
  return data.quiz;
};

export const evaluateQuizPerformance = async (
  subject: string,
  topic: string,
  questions: QuizQuestion[],
  responses: any[],
  examDate?: string
): Promise<QuizResult> => {
  return apiFetch('/api/quiz/evaluate', {
    method: 'POST',
    body: JSON.stringify({ subject, topic, questions, responses, examDate })
  });
};

export const getAIResources = async (topic: string, subject: string, subtopic?: string): Promise<StudyResource[]> => {
  const data = await apiFetch('/api/resources', {
    method: 'POST',
    body: JSON.stringify({ topic, subject, subtopic })
  });
  return data.resources;
};

export const generateLearningContent = async (
  subject: string,
  topic: string,
  level: string,
  examDate?: string,
  learningStyle: string = 'Mixed',
  sessionType: string = 'Learning'
): Promise<{ subparts: { title: string, content: string }[] }> => {
  return apiFetch('/api/learning/content', {
    method: 'POST',
    body: JSON.stringify({ subject, topic, level, examDate, learningStyle, sessionType })
  });
};

export const chatWithAI = async (history: { role: string, parts: any[] }[], message: string) => {
  const data = await apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ history, message })
  });
  return data.response;
};
