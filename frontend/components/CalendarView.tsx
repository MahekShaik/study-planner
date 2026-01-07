
import React, { useState, useMemo } from 'react';
import { StudyTask, OnboardingData } from '../types';

interface CalendarViewProps {
  tasks: StudyTask[];
  activePlans: OnboardingData[];
  onStartTask: (task: StudyTask) => void;
  onMarkCompleted: (task: StudyTask) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, activePlans, onStartTask, onMarkCompleted }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Using local ISO format YYYY-MM-DD safely
  const getLocalDateISO = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const todayISO = getLocalDateISO(today);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Generate 21 days for compact and 28 days for expanded (4 full weeks)
  const calendarDates = useMemo(() => {
    const count = isExpanded ? 28 : 21;
    const startOffset = isExpanded ? 0 : -7; // Expanded starts from today for clarity, Compact shows past week

    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + startOffset + i);
      return d;
    });
  }, [isExpanded]);

  // Filter tasks for the detail view
  const dayTasks = tasks.filter(t => t.date === selectedDate);

  // Map subjects to colors for differentiation
  const subjectColorMap = useMemo(() => {
    const colors = [
      { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', dot: 'bg-indigo-400' },
      { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-400' },
      { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-400' },
      { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', dot: 'bg-rose-400' },
      { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', dot: 'bg-violet-400' },
    ];

    const map: Record<string, typeof colors[0]> = {};
    activePlans.forEach((plan, i) => {
      const subject = (plan.level || plan.skill || 'General').toLowerCase();
      map[subject] = colors[i % colors.length];
    });
    return map;
  }, [activePlans]);

  const formatDateInfo = (date: Date) => {
    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      iso: getLocalDateISO(date)
    };
  };

  const getDisplayDateHeader = (iso: string) => {
    // Append T00:00:00 to treat as local time to avoid timezone shift back one day
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 pt-16 px-6 animate-fade-in mb-20">
      <header className="mb-10 flex justify-between items-end">
        <div className="text-left">
          <h1 className="text-3xl font-light text-slate-800 mb-2">Schedule</h1>
          <p className="text-slate-500">Browse your personalized learning journey.</p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
          {isExpanded ? 'Compact View' : 'Expanded View'}
        </button>
      </header>

      {isExpanded ? (
        /* Grid View */
        <div className="grid grid-cols-7 gap-2 mb-12 animate-slide-up">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2">
              {day}
            </div>
          ))}
          {calendarDates.map((date, idx) => {
            const { dayNum, iso } = formatDateInfo(date);
            const isSelected = iso === selectedDate;
            const isToday = iso === todayISO;
            const dayTasks = tasks.filter(t => t.date === iso);
            const examPlans = activePlans.filter(p => p.examDate === iso);
            const isExamDate = examPlans.length > 0;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(iso)}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all p-1 relative ${isSelected
                  ? 'bg-slate-800 border-slate-800 shadow-lg text-white'
                  : isExamDate
                    ? `${subjectColorMap[(examPlans[0].level || 'general').toLowerCase()]?.bg || 'bg-rose-50'} ${subjectColorMap[(examPlans[0].level || 'general').toLowerCase()]?.border || 'border-rose-200'} ring-2 ${subjectColorMap[(examPlans[0].level || 'general').toLowerCase()]?.border.replace('border-', 'ring-') || 'ring-rose-100'}`
                    : 'bg-white border-slate-100 hover:border-slate-300'
                  }`}
              >
                <span className={`text-sm font-medium ${isSelected ? 'text-white' : isExamDate ? (subjectColorMap[(examPlans[0].level || 'general').toLowerCase()]?.text || 'text-rose-600') : 'text-slate-800'}`}>
                  {dayNum}
                </span>
                {isExamDate ? (
                  <div className="flex gap-0.5 mt-1">
                    {examPlans.map((p, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${subjectColorMap[(p.level || 'general').toLowerCase()]?.dot || 'bg-rose-500'}`}></div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-0.5 mt-1 min-h-[4px]">
                    {Array.from(new Set(dayTasks.map(t => (t.subject || 'general').toLowerCase()))).slice(0, 3).map(sub => (
                      <div key={sub} className={`w-1 h-1 rounded-full ${subjectColorMap[sub]?.dot || 'bg-slate-300'}`}></div>
                    ))}
                  </div>
                )}
                {isToday && !isSelected && (
                  <div className="absolute top-1 right-1 w-1 h-1 bg-indigo-500 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Horizontal Scrollable Date Strip */
        <div className="relative mb-12">
          <div className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide px-2 -mx-2 snap-x">
            {calendarDates.map((date, idx) => {
              const { dayName, dayNum, iso } = formatDateInfo(date);
              const isSelected = iso === selectedDate;
              const isToday = iso === todayISO;
              const dayTasksSlice = tasks.filter(t => t.date === iso);

              // Collect all exam plans that fall on this day
              const examPlans = activePlans.filter(p => p.examDate === iso);
              const isExamDate = examPlans.length > 0;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(iso)}
                  className={`flex-shrink-0 w-20 h-28 rounded-2xl flex flex-col items-center justify-center transition-all snap-center border relative ${isSelected
                    ? 'bg-slate-800 border-slate-800 shadow-xl shadow-slate-200 -translate-y-1'
                    : isExamDate
                      ? `${subjectColorMap[(examPlans[0].level || 'general').toLowerCase()]?.bg || 'bg-rose-50'} ${subjectColorMap[(examPlans[0].level || 'general').toLowerCase()]?.border || 'border-rose-200'} ring-2 ${subjectColorMap[(examPlans[0].level || 'general').toLowerCase()]?.border.replace('border-', 'ring-') || 'ring-rose-100'} ring-offset-2`
                      : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                    {dayName}
                  </span>
                  <span className={`text-2xl font-medium ${isSelected ? 'text-white' : isExamDate ? (subjectColorMap[(examPlans[0].level || 'general').toLowerCase()]?.text || 'text-rose-600') : 'text-slate-800'}`}>
                    {dayNum}
                  </span>
                  {isExamDate ? (
                    <span className={`text-[8px] font-bold ${subjectColorMap[(examPlans[0].level || 'general').toLowerCase()]?.text || 'text-rose-500'} mt-1 uppercase tracking-tighter`}>
                      {examPlans.length > 1 ? `${examPlans.length} EXAMS` : 'EXAM'}
                    </span>
                  ) : (
                    <>
                      {dayTasksSlice.length > 0 && !isSelected && (
                        <div className="flex gap-0.5 mt-2">
                          {/* Show small colored dots for each subject active on this day */}
                          {Array.from(new Set(dayTasksSlice.map(t => (t.subject || 'general').toLowerCase()))).slice(0, 3).map(sub => (
                            <div key={sub} className={`w-1.5 h-1.5 rounded-full ${subjectColorMap[sub]?.dot || 'bg-slate-400'}`}></div>
                          ))}
                        </div>
                      )}
                      {isToday && !isSelected && (
                        <span className="text-[8px] font-bold text-indigo-500 mt-1 uppercase">Today</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <div className="absolute left-0 top-0 bottom-8 w-8 bg-gradient-to-r from-[#f8fafc] to-transparent pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-8 w-8 bg-gradient-to-l from-[#f8fafc] to-transparent pointer-events-none"></div>
        </div>
      )}

      {/* Selected Day Details */}
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-xl font-medium text-slate-800">
            {getDisplayDateHeader(selectedDate)}
          </h2>
          <span className="text-sm text-slate-400 font-medium">
            {dayTasks.length} {dayTasks.length === 1 ? 'Session' : 'Sessions'}
          </span>
        </div>

        {dayTasks.length > 0 ? (
          dayTasks.map((task) => {
            const isRevision = task.sessionType.toLowerCase().includes('revision');
            const isWeakArea = task.sessionType.toLowerCase().includes('weak');
            const subjectStyle = subjectColorMap[(task.subject || 'general').toLowerCase()] || { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' };

            const typeColor = isWeakArea ? 'text-amber-500' : isRevision ? 'text-emerald-500' : subjectStyle.text;
            const typeBg = isWeakArea ? 'bg-amber-50' : isRevision ? 'bg-emerald-50' : subjectStyle.bg;
            const typeBorder = isWeakArea ? 'border-amber-100' : isRevision ? 'border-emerald-100' : subjectStyle.border;

            return (
              <div
                key={task.id}
                className={`bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow ${task.status === 'completed' ? 'opacity-60' : task.status === 'in_progress' ? 'border-indigo-100 ring-1 ring-indigo-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {task.status === 'completed' ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : task.status === 'in_progress' ? (
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                      </div>
                    ) : (
                      <div className={`w-6 h-6 rounded-full ${typeBg} flex items-center justify-center ${typeColor} text-[10px] font-bold`}>
                        {task.sessionType[0]}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded ${subjectStyle.bg} ${subjectStyle.text} border ${subjectStyle.border}`}>
                          {task.subject}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded ${typeBg} ${typeColor} border ${typeBorder}`}>
                          {task.sessionType}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-slate-800">{task.topic}</h3>
                      <p className="text-slate-400 text-xs font-medium italic">{task.subtopic}</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    {task.duration}
                  </div>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {task.aiExplanation}
                </p>

                {task.status === 'completed' ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 font-medium bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs">Topic Mastered</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                      Scheduled
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-white/50 border border-dashed border-slate-200 rounded-2xl">
            <div className="text-4xl mb-4">🍃</div>
            <h3 className="text-xl font-medium text-slate-800 mb-2">A Quiet Day</h3>
            <p className="text-slate-400 italic font-light">No sessions scheduled for this date. Focus on past content or take a well-deserved break.</p>
          </div>
        )}
      </div>

      <div className="mt-16 p-8 bg-slate-50 border border-slate-100 rounded-2xl">
        <h4 className="text-slate-800 font-medium mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Dynamic Forecasting
        </h4>
        <p className="text-slate-500 text-sm leading-relaxed">
          Your future schedule is recalculated every evening. We adjust your upcoming sessions based on today's quiz performance and how much focus you applied to each topic.
        </p>
      </div>
    </div>
  );
};

export default CalendarView;
