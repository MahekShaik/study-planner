import React, { useState, useMemo } from 'react';
import { StudyTask, OnboardingData } from '../types';
import Sidebar from './Sidebar';

interface StudyDashboardProps {
  tasks: StudyTask[];
  onboardingData: OnboardingData | null;
  allPlans: OnboardingData[];
  onStartTask: (task: StudyTask) => void;
  onMarkCompleted: (task: StudyTask) => void;
  onStartNewPlan: () => void;
  onSelectPlan: (plan: OnboardingData) => void;
  onViewLibrary: () => void;
  onViewResources: (task: StudyTask) => void;
  streak?: number;
}

const StudyDashboard: React.FC<StudyDashboardProps> = ({
  tasks,
  onboardingData,
  allPlans,
  onStartTask,
  onMarkCompleted,
  onStartNewPlan,
  onSelectPlan,
  onViewLibrary,
  onViewResources,
  streak = 0
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile state
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false); // Desktop state
  const [searchTerm, setSearchTerm] = useState('');

  const examPlans = allPlans.filter(p => p.mode === 'exam');
  const isUnifiedExam = onboardingData?.mode === 'exam' && examPlans.length > 1;

  const examName = isUnifiedExam
    ? `UNIFIED EXAM PATH (${examPlans.length} EXAMS)`
    : (onboardingData?.level || onboardingData?.skill || 'Study Plan').toUpperCase();
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Filter tasks to show only pending/active ones matching search
  const activeTasks = useMemo(() => {
    return tasks.filter(t => {
      const isPending = t.status !== 'completed';
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        t.topic.toLowerCase().includes(searchLower) ||
        t.subtopic.toLowerCase().includes(searchLower);
      return isPending && matchesSearch;
    });
  }, [tasks, searchTerm]);

  const isExamOver = useMemo(() => {
    if (onboardingData?.mode === 'exam' && onboardingData?.examDate) {
      const today = new Date().toISOString().split('T')[0];
      return onboardingData.examDate < today;
    }
    return false;
  }, [onboardingData]);

  const selectedDateObj = new Date(selectedDate);
  const formattedSelectedDate = selectedDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const dayNamePrefix = selectedDate === new Date().toISOString().split('T')[0] ? "Today" : selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        plans={allPlans}
        currentPlan={onboardingData}
        onSelectPlan={onSelectPlan}
        onNewPlan={onStartNewPlan}
        onViewLibrary={onViewLibrary}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isCollapsed={isDesktopCollapsed}
        onToggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
      />

      <div className={`flex-1 w-full transition-all duration-300 ${isDesktopCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        {/* Mobile Header for Sidebar Toggle */}
        <div className="md:hidden pt-6 px-6 flex items-center">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 shadow-sm"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="max-w-4xl mx-auto py-12 pt-32 px-6 animate-fade-in min-h-screen">
          {/* Cleaner Welcome Section - Moved to Top */}
          <section className="mb-10 px-8 py-10 bg-white border border-sage-border rounded-2xl shadow-sm relative overflow-hidden">
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-primary mb-2">Welcome back.</h2>
              <p className="text-slate-500 font-light max-w-md mx-auto md:mx-0 leading-relaxed text-sm">
                Your personalized study path is ready. Consistent efforts today lead to mastery tomorrow.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-sage-light rounded-full opacity-50" />
          </section>

          {/* Workspace Header - Moved below Welcome */}
          <header className="flex justify-between items-center mb-12 px-1">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em]">Workspace</h2>
                <span className="bg-sage-primary/10 text-sage-primary text-[9px] font-bold px-2 py-0.5 rounded-full border border-sage-primary/20">v2.0 Refined</span>
              </div>
              <h1 className="text-3xl font-bold text-primary tracking-tight">{examName}</h1>
            </div>
            <div className="flex flex-col items-end gap-1.5 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mastery</span>
                <span className="text-xs font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-sage-primary transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {/* Streak Indicator */}
              <div className="flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                <span className="text-xs">🔥</span>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">{streak} Day Streak</span>
              </div>
            </div>
          </header>

          {/* Daily Tasks Section */}
          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-1">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-primary tracking-tight">Active Study Plan</h3>
                <span className="text-sage-primary text-[10px] font-bold bg-sage-light px-3 py-1 rounded-full uppercase tracking-widest">
                  {activeTasks.length} {activeTasks.length === 1 ? 'Task' : 'Tasks'}
                </span>
              </div>

              {/* Modern Search Bar */}
              <div className="relative group w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400 group-focus-within:text-sage-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search topics or subtopics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white/50 backdrop-blur-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sage-primary/30 focus:border-sage-primary sm:text-xs transition-all shadow-sm group-hover:border-slate-300"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {activeTasks.map((task, idx) => (
                <div key={task.id} className={`study-card animate-fade-in rounded-[32px] overflow-hidden ${task.status === 'completed' ? 'opacity-60 bg-slate-50/50' : 'bg-[#162032]'} p-6`} style={{ animationDelay: `${idx * 100}ms` }}>
                  {/* Image 4 Reference: Time Column - REMOVED per user request, replaced with simple icon */}
                  <div className="flex flex-col items-center justify-start pt-1 min-w-[60px] border-r border-white/10 pr-4">
                    <div className="bg-white/10 p-2 rounded-full mb-3 shadow-inner">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">Task {idx + 1}</span>
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 pl-2">
                    <div className="mb-4">
                      <p className="text-[11px] font-bold text-blue-200/80 uppercase tracking-widest mb-1">{task.subject}</p>
                      <h4 className="text-lg font-bold text-white tracking-tight mb-0.5">{task.topic}</h4>
                      <p className="text-sm text-slate-300 font-light">{task.subtopic}</p>
                    </div>

                    <button
                      onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      className="mb-6 border-none bg-transparent !text-white w-full text-left transition-all hover:bg-white/5 active:scale-[0.99] cursor-pointer rounded-2xl p-0 flex items-start gap-2"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-white flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>

                      <div className="flex flex-col">
                        <span className={`text-xs text-white font-medium ${expandedTaskId === task.id ? '' : 'line-clamp-1'}`}>
                          {task.aiExplanation}
                        </span>
                        {expandedTaskId !== task.id && (task.aiExplanation?.length || 0) > 100 && (
                          <span className="text-[10px] text-white/70 mt-1 font-bold">Click to read more</span>
                        )}
                      </div>
                    </button>



                    <div className="flex gap-4 mt-auto pt-4">
                      {task.status === 'completed' ? (
                        <div className="flex items-center gap-2 border border-slate-100 px-6 py-2.5 rounded-xl text-[13px] font-bold text-slate-400 bg-slate-50">
                          <svg className="w-4 h-4 text-sage-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          Marked Complete
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => onViewResources(task)}
                            className="border border-white/20 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2 h-10 mr-2"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            Study
                          </button>

                          <button
                            onClick={() => onMarkCompleted(task)}
                            className="border border-white/20 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center h-10 mr-2"
                          >
                            Mark Complete
                          </button>
                          <button
                            onClick={() => onStartTask(task)}
                            className="border border-white/20 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 h-10"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Need Help
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {activeTasks.length === 0 && (
                <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-white/50 backdrop-blur-sm">
                  <span className="text-5xl mb-6 block opacity-20">{isExamOver ? '🎓' : '🍃'}</span>
                  <p className="text-slate-400 font-medium italic">
                    {isExamOver
                      ? "Congratulations! Your exam period has concluded."
                      : "Your garden of tasks is empty for this day."}
                  </p>
                  <p className="text-slate-300 text-xs mt-2">
                    {isExamOver
                      ? "Take a well-deserved break or start a new journey."
                      : "Adjust your calendar or take a rest."}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Methodology Section */}
          <section className="mt-20 pt-12 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-[0.25em]">Precision Learning Engine</h3>
            <div className="bg-sage-light/30 border border-sage-border/50 rounded-2xl p-8">
              <p className="text-primary/70 text-sm leading-relaxed italic font-light">
                "Your journey is analyzed using AI performance tracking and spaced repetition models.
                Each task is strategically weighted to ensure maximum retention with minimum cognitive load."
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudyDashboard;
