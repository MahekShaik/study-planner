
import React, { useState, useMemo } from 'react';
import { StudyTask } from '../types';

interface CalendarViewProps {
  tasks: StudyTask[];
  examDate?: string;
  onStartTask: (task: StudyTask) => void;
  onMarkCompleted: (task: StudyTask) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, examDate, onStartTask, onMarkCompleted }) => {
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

  // Generate 21 days of calendar (one week back, two weeks forward)
  const calendarDates = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 7 + i);
      return d;
    });
  }, []);

  // Filter tasks for the detail view
  const dayTasks = tasks.filter(t => t.date === selectedDate);

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
    <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-light text-slate-800 mb-2">Schedule</h1>
        <p className="text-slate-500">Browse your personalized learning journey.</p>
      </header>

      {/* Horizontal Scrollable Date Strip */}
      <div className="relative mb-12">
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide px-2 -mx-2 snap-x">
          {calendarDates.map((date, idx) => {
            const { dayName, dayNum, iso } = formatDateInfo(date);
            const isSelected = iso === selectedDate;
            const isToday = iso === todayISO;
            const hasTasks = tasks.some(t => t.date === iso);

            const isExamDate = iso === examDate;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(iso)}
                className={`flex-shrink-0 w-20 h-28 rounded-2xl flex flex-col items-center justify-center transition-all snap-center border ${isSelected
                  ? 'bg-slate-800 border-slate-800 shadow-xl shadow-slate-200 -translate-y-1'
                  : isExamDate
                    ? 'bg-red-50 border-red-200 ring-2 ring-red-100 ring-offset-2'
                    : 'bg-white border-slate-100 hover:border-slate-300'
                  }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                  {dayName}
                </span>
                <span className={`text-2xl font-medium ${isSelected ? 'text-white' : isExamDate ? 'text-red-600' : 'text-slate-800'}`}>
                  {dayNum}
                </span>
                {isExamDate ? (
                  <span className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">EXAM</span>
                ) : (
                  <>
                    {hasTasks && !isSelected && (
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2"></div>
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
        <div className="absolute left-0 top-0 bottom-6 w-8 bg-gradient-to-r from-[#f8fafc] to-transparent pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-6 w-8 bg-gradient-to-l from-[#f8fafc] to-transparent pointer-events-none"></div>
      </div>

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
            const typeColor = isWeakArea ? 'text-amber-500' : isRevision ? 'text-emerald-500' : 'text-indigo-500';
            const typeBg = isWeakArea ? 'bg-amber-50' : isRevision ? 'bg-emerald-50' : 'bg-indigo-50';
            const typeBorder = isWeakArea ? 'border-amber-100' : isRevision ? 'border-emerald-100' : 'border-indigo-100';

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
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
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
