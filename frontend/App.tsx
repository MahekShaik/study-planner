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
// MoodSnackbar usage removed in favor of dedicated screen
import MoodCheckInScreen from './components/MoodCheckInScreen';

import LandingPage from './components/LandingPage';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('authToken');
    if (saved === 'undefined' || saved === 'null' || !saved) return null;
    return saved;
  });
  // Default to 'landing' if not authenticated
  const [currentScreen, setCurrentScreen] = useState<Screen>(token ? 'onboarding' : 'landing');
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [allPlans, setAllPlans] = useState<OnboardingData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<OnboardingData | null>(null);
  const [activeTask, setActiveTask] = useState<StudyTask | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ email: string; name: string; dailyHours: number; currentStreak?: number; streakHistory?: string[]; needsMoodCheck?: boolean } | null>(null);
  // showMoodSnackbar removed
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Sync session on mount
  useEffect(() => {
    if (token) {
      hydrateSession(token);
    }
  }, [token]);

  async function hydrateSession(authToken: string) {
    try {
      // Fetch user profile
      const profileResponse = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      let shouldShowMoodCheck = false;
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        setUserProfile(profile);
        if (profile.needsMoodCheck) {
          shouldShowMoodCheck = true;
          setCurrentScreen('mood-check');
        }
      }

      // Fetch ALL Plans
      const plansResponse = await fetch('/api/onboarding', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // Fetch ALL Tasks
      const tasksResponse = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (plansResponse.ok && tasksResponse.ok) {
        const plans = await plansResponse.json();
        const allTasks = await tasksResponse.json();

        setAllPlans(plans || []);
        setTasks(allTasks || []);

        if (plans.length > 0) {
          // Default to the most recent plan (first in list usually, or just 0)
          setSelectedPlan(plans[0]);

          if (!shouldShowMoodCheck) {
            setCurrentScreen('dashboard');
          }
        } else {
          setCurrentScreen('onboarding');
        }
      } else if (plansResponse.status === 401 || tasksResponse.status === 401) {
        handleExitSession();
      }
    } catch (e) {
      console.error("Session hydration failed", e);
    }
  }

  const handleMoodSubmit = async (mood: string) => {
    try {
      if (!token) return;

      const response = await fetch('/api/user/mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mood })
      });

      if (response.ok) {
        // Update user profile to reflect mood has been logged
        setUserProfile(prev => prev ? { ...prev, needsMoodCheck: false, currentMood: mood } : prev);
        // Navigate to dashboard if plan exists, otherwise onboarding
        setCurrentScreen(selectedPlan ? 'dashboard' : 'onboarding');
      } else {
        console.error('Failed to save mood');
      }
    } catch (error) {
      console.error('Error saving mood:', error);
    }
  };

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
        const { plan, tasks: newTasks } = await response.json();
        setSelectedPlan(plan);
        // Append new tasks instead of replacing
        setTasks(prev => [...prev, ...(newTasks || [])]);
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

  const handleMarkCompleted = (task: StudyTask) => {
    setActiveTask(task);
    setCurrentScreen('quiz');
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

    // Update streak locally if returned from evaluation
    console.log('[Streak Debug Frontend] Quiz result:', result);
    if ((result as any).streakUpdate) {
      console.log('[Streak Debug Frontend] Streak update found:', (result as any).streakUpdate);
      setUserProfile(prev => prev ? ({ ...prev, currentStreak: (result as any).streakUpdate.newStreak }) : prev);
    } else {
      console.log('[Streak Debug Frontend] No streak update in result');
    }

    // Refresh user profile from server to get updated streak and history
    if (token) {
      try {
        const profileResponse = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          setUserProfile(profile);
        }
      } catch (e) {
        console.error("Failed to refresh profile", e);
      }
    }

    setCurrentScreen('dashboard');
  }, [activeTask, token]);

  const handleExitSession = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setAllPlans([]);
    setSelectedPlan(null);
    setActiveTask(null);
    setIsProfileMenuOpen(false);
    setCurrentScreen('landing');
  };

  const handleShowUserProfile = () => {
    setIsProfileMenuOpen(false);
    setCurrentScreen('user-profile');
  };

  const renderScreen = () => {
    // Landing Page accessible without token
    if (currentScreen === 'landing') {
      return <LandingPage onGetStarted={() => setCurrentScreen('auth')} onLogin={() => setCurrentScreen('auth')} />;
    }

    // Route Protection: Essential check
    if (!token) {
      return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
    }

    switch (currentScreen) {
      case 'onboarding':
        return <OnboardingView onComplete={handleOnboardingComplete} onLogout={handleExitSession} initialData={selectedPlan} onExamModeRequest={handleExamModeRequest} userDailyHours={userProfile?.dailyHours || 4} />;
      case 'exam-selection':
        return <ExamSelectionView plans={allPlans} tasks={tasks} onSelectPlan={handleSelectPlan} onNewExam={handleStartNewExam} />;
      case 'dashboard':
      case 'learning':
      case 'quiz':
        // Filter tasks to match the currently selected plan (by level/skill matches)
        const activePlanKeyword = selectedPlan?.mode === 'exam' ? selectedPlan.level : selectedPlan?.skill;
        const filteredTasks = tasks.filter(t => {
          if (!activePlanKeyword) return true; // Show all if no plan selected (fallback)
          const taskSubject = (t.subject || '').toLowerCase();
          const planSubject = activePlanKeyword.toLowerCase();
          return taskSubject.includes(planSubject) || planSubject.includes(taskSubject);
        });

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
            allPlans={allPlans}
            onStartTask={handleStartTask}
            onMarkCompleted={handleMarkCompleted}
            onStartNewPlan={handleStartNewExam}
            onSelectPlan={handleSelectPlan}
            onViewResources={handleViewResources}
            streak={userProfile?.currentStreak || 0}
          />
        );
      case 'mood-check':
        return (
          <MoodCheckInScreen
            onMoodSelected={handleMoodSubmit}
            userName={userProfile?.name}
          />
        );
      case 'insights':
        return <InsightsPanel insights={insights} streakHistory={userProfile?.streakHistory || []} />;
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
        return <OnboardingView onComplete={handleOnboardingComplete} onLogout={handleExitSession} initialData={selectedPlan} onExamModeRequest={handleExamModeRequest} userDailyHours={userProfile?.dailyHours || 4} />;
      default:
        return (
          <StudyDashboard
            tasks={tasks}
            onboardingData={selectedPlan}
            allPlans={allPlans}
            onStartTask={handleStartTask}
            onMarkCompleted={handleMarkCompleted}
            onStartNewPlan={handleStartNewExam}
            onSelectPlan={handleSelectPlan}
            onViewResources={handleViewResources}
            streak={userProfile?.currentStreak || 0}
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

  const isUtilityScreen = ['chat', 'resources', 'quiz', 'learning', 'auth', 'onboarding', 'exam-selection', 'landing', 'mood-check'].includes(currentScreen);
  const isLayoutManagedScreen = ['dashboard', 'calendar', 'insights', 'user-profile'].includes(currentScreen);

  return (
    <div className="min-h-screen flex flex-col">
      {currentScreen !== 'landing' && (
        <>
          {/* Global Back Button */}
          <button
            onClick={() => {
              // Clear active task state when navigating back
              setActiveTask(null);

              const backToDashboard = ['learning', 'quiz', 'insights', 'calendar', 'chat', 'resources', 'user-profile', 'exam-selection'];

              if (backToDashboard.includes(currentScreen)) {
                setCurrentScreen('dashboard');
              } else {
                // Default back to landing for Auth, Onboarding, Dashboard, Mood-Check
                handleExitSession(); // Ensure clean exit for Auth/Dashboard -> Landing
              }
            }}
            className="fixed top-6 left-6 z-[60] px-5 py-2.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full text-xs font-bold text-slate-600 uppercase tracking-widest shadow-sm hover:bg-white hover:text-indigo-600 hover:shadow-md hover:scale-105 active:scale-95 transition-all group flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>

          {/* Global Home Button */}
          <button
            onClick={handleExitSession}
            className="fixed top-6 right-6 z-[60] px-5 py-2.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full text-xs font-bold text-slate-600 uppercase tracking-widest shadow-sm hover:bg-white hover:text-indigo-600 hover:shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            Home
          </button>
        </>
      )}

      {/* Main App Navigation (Floating Dock) */}
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

      {/* Updated Main Layout: Remove default centering and margin for layout-managed screens */}
      <main className={`flex-1 flex flex-col ${isLayoutManagedScreen ? 'items-stretch w-full' : 'items-center justify-center'} ${(!isUtilityScreen && !isLayoutManagedScreen) ? 'mt-32' : ''} animate-fade-in w-full`}>
        <div className={`w-full ${(['landing', 'auth'].includes(currentScreen) || isLayoutManagedScreen) ? '' : 'max-w-4xl'}`}>
          {renderScreen()}
        </div>
      </main>

      {!isUtilityScreen && (
        <footer className="py-8 flex justify-center opacity-40 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">S</div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-slate-900">SereneStudy AI</span>
          </div>
        </footer>
      )}

      {/* Mood Snackbar removed */}
    </div>
  );
};

export default App;
