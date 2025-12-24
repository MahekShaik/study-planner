
import React from 'react';
import { StudyTask } from '../types';

interface PastSessionsViewProps {
  tasks: StudyTask[];
  onBack: () => void;
}

const PastSessionsView: React.FC<PastSessionsViewProps> = ({ tasks, onBack }) => {
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div>
          <h1 className="text-3xl font-light text-slate-800">Past Sessions</h1>
          <p className="text-slate-500">A log of your learning achievements.</p>
        </div>
      </div>

      <div className="space-y-6">
        {completedTasks.length > 0 ? (
          completedTasks.map((task) => (
            <div key={task.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm opacity-80">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1 block">
                    Completed {task.date ? new Date(task.date + 'T00:00:00').toLocaleDateString() : ''}
                  </span>
                  <h3 className="text-lg font-medium text-slate-800">{task.topic}</h3>
                  <p className="text-sm text-slate-500">{task.subject}</p>
                </div>
                <div className="bg-emerald-50 p-2 rounded-full">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white/50 border border-dashed border-slate-200 rounded-2xl">
            <div className="text-4xl mb-4">📖</div>
            <p className="text-slate-400 italic font-light">Your completed sessions will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PastSessionsView;
