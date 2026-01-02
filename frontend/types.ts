
export type Screen = 'landing' | 'auth' | 'onboarding' | 'dashboard' | 'quiz' | 'insights' | 'calendar' | 'chat' | 'resources' | 'user-profile' | 'learning' | 'exam-selection';

export interface OnboardingData {
  mode: 'exam' | 'skill';
  level: string;
  syllabus?: string;
  examDate?: string;
  hoursPerDay?: number;
  planType: 'balanced' | 'intense';
  learningStyle?: 'Flashcards' | 'Analogies' | 'Practice' | 'Mixed';
  skill?: string;
  skillDuration?: string;
  syllabusFiles?: { name: string, data: string, type: string }[];
}

export interface StudyTask {
  id: string;
  subject: string;
  topic: string;
  subtopic: string; // The main subtopic from the plan
  duration: string;
  sessionType: 'Learning' | 'Revision' | 'Mixed Review';
  aiExplanation: string;
  status: 'pending' | 'in_progress' | 'completed';
  date: string; // YYYY-MM-DD
  completedSubtopics?: string[]; // Titles of subparts from LearningView
  quizStatus?: 'not_started' | 'started' | 'completed';
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'short';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizResult {
  score: number;
  total: number;
  insight: string;
  weakSubtopics: string[];
  stableSubtopics: string[];
  suggestedRevisionTasks?: StudyTask[];
}

export interface AIInsight {
  id: string;
  title: string;
  reasoning: string;
  change: string;
  icon: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface StudyResource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'website';
  description: string;
}
