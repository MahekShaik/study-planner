import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Screen, StudyTask, AIInsight, OnboardingData, QuizResult } from './types';
import { MOCK_INSIGHTS } from './constants';
import { evaluateQuizPerformance, chatWithAI, getAIResources } from './services/geminiService';
import StudyDashboard from './components/StudyDashboard';
import QuizScreen from './components/QuizScreen';
import InsightsPanel from './components/InsightsPanel';
import CalendarView from './components/CalendarView';
import ChatView from './components/ChatView';
import ResourcesView from './components/ResourcesView';
import LearningView from './components/LearningView';
import OnboardingView from './components/OnboardingView';
import UserProfile from './components/UserProfile';
import AuthScreen from './components/AuthScreen';
import ExamSelectionView from './components/ExamSelectionView';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('authToken');
    if (saved === 'undefined' || saved === 'null' || !saved) return null;
    return saved;
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>(token ? 'onboarding' : 'auth');
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [allPlans, setAllPlans] = useState<OnboardingData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<OnboardingData | null>(null);
  const [activeTask, setActiveTask] = useState<StudyTask | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Sync session on mount
  useEffect(() => {
    if (token) {
      hydrateSession(token);
    }
  }, [token]);

  async function hydrateSession(authToken: string) {
    try {
      // Fetch Active Study Plan (includes both plan details and tasks)
      const response = await fetch('/api/study-plan/active', {
        headers: { 'Authorization': `Bearer ${authToken} ` }
      });

      if (response.ok) {
        const { plan, tasks } = await response.json();
        setTasks(tasks || []);
        setSelectedPlan(plan);
        if (plan) {
          setAllPlans([plan]);
          setCurrentScreen('dashboard');
        } else {
          setCurrentScreen('onboarding');
        }
      } else if (response.status === 401) {
        handleExitSession();
      }
    } catch (e) {
      console.error("Session hydration failed", e);
    }
  }

  const handleAuthSuccess = () => {
    const newToken = localStorage.getItem('authToken');
    setToken(newToken);
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      if (!token) return;

      // Call unified generation endpoint
      const response = await fetch('/api/study-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token} `
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const { plan, tasks } = await response.json();
        setSelectedPlan(plan);
        setTasks(tasks || []);
        setAllPlans(prev => [...prev, plan]);
        setCurrentScreen('dashboard');
      } else {
        throw new Error("Failed to generate plan on server");
      }
    } catch (e) {
      console.error("Failed to generate/save plan", e);
      // Fallback or error state could be added here
      setCurrentScreen('dashboard');
    }
  };

  const handleStartTask = (task: StudyTask) => {
    setActiveTask(task);
    setCurrentScreen('chat');
  };

  const handleLearningFinish = () => {
    setCurrentScreen('quiz');
  };

  const handleFeelingStuck = (task: StudyTask) => {
    setActiveTask(task);
    setCurrentScreen('chat');
  };

  const handleViewResources = (task: StudyTask) => {
    setActiveTask(task);
    setCurrentScreen('resources');
  };

  const handleUpdateProgress = async (taskId: string, updates: Partial<StudyTask>) => {
    try {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      ));

      if (token) {
        await fetch(`/api/tasks/${taskId}/progress`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updates)
        });
      }
    } catch (e) {
      console.error("Failed to update task progress", e);
    }
  };

  const handleMarkCompleted = async (task: StudyTask) => {
    await handleUpdateProgress(task.id, { status: 'completed', quizStatus: 'completed' });
  };

  const handleSelectPlan = (plan: OnboardingData) => {
    setSelectedPlan(plan);
    setCurrentScreen('dashboard');
  };

  const handleStartNewExam = () => {
    setCurrentScreen('onboarding');
  };

  const handleExamModeRequest = () => {
    if (allPlans.length > 0) {
      setCurrentScreen('exam-selection');
    } else {
      setCurrentScreen('onboarding');
    }
  };

  const handleQuizFinish = useCallback(async (result: QuizResult) => {
    if (activeTask) {
      await handleUpdateProgress(activeTask.id, {
        status: 'completed',
        quizStatus: 'completed',
        completedSubtopics: activeTask.completedSubtopics
      });

      // Handle suggested revision tasks if any
      if (result.suggestedRevisionTasks && result.suggestedRevisionTasks.length > 0) {
        try {
          if (token) {
            const response = await fetch('/api/tasks', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(result.suggestedRevisionTasks)
            });
            if (response.ok) {
              const saved = await response.json();
              setTasks(prev => [...prev, ...saved]);
            }
          }
        } catch (e) {
          console.error("Failed to save revision tasks", e);
        }
      }
    }
    setActiveTask(null);
    setCurrentScreen('dashboard');
  }, [activeTask, token]);

  const handleExitSession = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setAllPlans([]);
    setSelectedPlan(null);
    setActiveTask(null);
    setIsProfileMenuOpen(false);
    setCurrentScreen('auth');
  };

  const handleShowUserProfile = () => {
    setIsProfileMenuOpen(false);
    setCurrentScreen('user-profile');
  };

  const renderScreen = () => {
    // Route Protection: Essential check
    if (!token) {
      return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
    }

    switch (currentScreen) {
      case 'onboarding':
        return <OnboardingView onComplete={handleOnboardingComplete} onLogout={handleExitSession} initialData={selectedPlan} onExamModeRequest={handleExamModeRequest} />;
      case 'exam-selection':
        return <ExamSelectionView plans={allPlans} tasks={tasks} onSelectPlan={handleSelectPlan} onNewExam={handleStartNewExam} />;
      case 'dashboard':
      case 'learning':
      case 'quiz':
        // The tasks in state are the tasks for the current plan
        const filteredTasks = tasks;

        if (currentScreen === 'learning' && activeTask) {
          return (
            <LearningView
              task={activeTask}
              onFinish={handleLearningFinish}
              onBack={() => setCurrentScreen('dashboard')}
              level={selectedPlan?.level || ''}
              examDate={selectedPlan?.examDate}
              learningStyle={selectedPlan?.learningStyle}
              onUpdateProgress={handleUpdateProgress}
            />
          );
        }

        if (currentScreen === 'quiz' && activeTask) {
          return (
            <QuizScreen
              task={activeTask}
              onFinish={handleQuizFinish}
              examDate={selectedPlan?.examDate}
            />
          );
        }

        return (
          <StudyDashboard
            tasks={filteredTasks}
            onboardingData={selectedPlan}
            onStartTask={handleStartTask}
            onMarkCompleted={handleMarkCompleted}
            onStartNewPlan={handleStartNewExam}
          />
        );
      case 'insights':
        return <InsightsPanel insights={insights} />;
      case 'calendar':
        const calTasks = tasks.filter(t =>
          selectedPlan?.level === t.subject ||
          selectedPlan?.skill === t.subject ||
          selectedPlan?.syllabus?.includes(t.subject)
        );
        return (
          <CalendarView
            tasks={calTasks}
            examDate={selectedPlan?.examDate}
            onStartTask={handleStartTask}
            onMarkCompleted={handleMarkCompleted}
          />
        );
      case 'chat':
        return <ChatView task={activeTask} onBack={() => setCurrentScreen('dashboard')} />;
      case 'resources':
        return <ResourcesView task={activeTask} onBack={() => setCurrentScreen('dashboard')} />;
      case 'user-profile':
        return <UserProfile tasks={tasks} onboardingData={selectedPlan} onBack={() => setCurrentScreen('dashboard')} onLogout={handleExitSession} onStartNewPlan={handleStartNewExam} />;
      case 'auth':
        return <OnboardingView onComplete={handleOnboardingComplete} onLogout={handleExitSession} initialData={selectedPlan} onExamModeRequest={handleExamModeRequest} />;
      default:
        return (
          <StudyDashboard
            tasks={tasks.filter(t => selectedPlan?.level === t.subject || selectedPlan?.skill === t.subject)}
            onboardingData={selectedPlan}
            onStartTask={handleStartTask}
            onMarkCompleted={handleMarkCompleted}
            onStartNewPlan={handleStartNewExam}
          />
        );
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isUtilityScreen = ['chat', 'resources', 'quiz', 'learning', 'auth', 'onboarding', 'exam-selection'].includes(currentScreen);

  return (
    <div className="min-h-screen flex flex-col">
      {!isUtilityScreen && (
        <nav className="fixed top-8 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
          <div className="max-w-xl w-full flex justify-between items-center pointer-events-auto glass-card px-3 py-2.5 rounded-[32px] shadow-2xl shadow-slate-200/50">
            <div className="flex gap-1 p-1 bg-slate-50/50 rounded-2xl">
              {[
                { id: 'dashboard', label: 'Plan' },
                { id: 'calendar', label: 'Calendar' },
                { id: 'insights', label: 'Insights' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentScreen(item.id as Screen)}
                  className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${currentScreen === item.id
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="relative mr-1" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-white hover:border-slate-200 transition-all shadow-sm active:scale-90"
              >
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full absolute top-2.5 right-2.5 animate-pulse"></div>
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 animate-fade-in">
                  <button
                    onClick={handleShowUserProfile}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </button>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button
                    onClick={handleExitSession}
                    className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 shadow-signout"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className={`flex-1 flex flex-col items-center justify-center ${!isUtilityScreen ? 'mt-32' : ''} animate-fade-in`}>
        <div className="w-full max-w-4xl">
          {renderScreen()}
        </div>
      </main>

      <footer className="py-8 flex justify-center opacity-40 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">S</div>
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-slate-900">SereneStudy AI</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
