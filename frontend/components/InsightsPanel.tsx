
import React from 'react';
import { AIInsight } from '../types';

interface InsightsPanelProps {
  insights: AIInsight[];
  streakHistory?: string[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, streakHistory = [] }) => {

  // Generate last 14 days for the timeline
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="max-w-2xl mx-auto py-12 pt-32 px-6 animate-fade-in">
      <header className="mb-12">
        <h2 className="text-[#8FB38F] text-[11px] font-bold uppercase tracking-[0.2em] mb-2">AI Analysis & Habits</h2>
        <h1 className="text-3xl font-bold text-[#2D3E35] tracking-tight">Insights</h1>

        {/* Streak Calendar */}
        <div className="mt-8 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="text-lg">🔥</span> Recent Activity
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {days.map(date => {
              const isStreakDay = streakHistory.includes(date);
              const dayNum = new Date(date).getDate();
              const isToday = date === new Date().toISOString().split('T')[0];

              return (
                <div key={date} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all
                   ${isStreakDay
                    ? 'bg-orange-50 border border-orange-100 text-orange-500 shadow-sm'
                    : isToday
                      ? 'bg-slate-100 border border-slate-200 text-slate-400'
                      : 'bg-white border border-slate-50 text-slate-300'
                  }
                 `}>
                  {isStreakDay ? '🔥' : dayNum}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center font-medium">Last 14 Days</p>
        </div>

      </header>

      <div className="space-y-6">
        {insights.length > 0 ? (
          insights.map((insight) => (
            <div
              key={insight.id}
              className="border border-[#E8EDE8] rounded-[32px] p-8 bg-white shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="flex items-start gap-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#F1F5F1] flex items-center justify-center text-2xl shrink-0">
                  {insight.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#2D3E35] tracking-tight">{insight.title}</h3>
                  <div className="bg-[#EAF0EA] text-[#5F855F] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full inline-block mt-2">
                    Dynamic Adjustment
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-bold text-[#8FB38F] uppercase tracking-[0.15em] block mb-2">Observation</span>
                  <p className="text-slate-600 leading-relaxed font-light italic text-[15px]">
                    "{insight.reasoning}"
                  </p>
                </div>

                <div className="p-5 bg-[#F8FAF8] rounded-2xl border border-[#EAF0EA]">
                  <span className="text-[10px] font-bold text-[#8FB38F] uppercase tracking-[0.15em] block mb-2">Adaptive Change</span>
                  <p className="text-[#2D3E35] font-semibold text-[15px]">
                    {insight.change}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center bg-white border border-dashed border-[#E8EDE8] rounded-[40px]">
            <div className="text-5xl mb-6 grayscale opacity-30">🧠</div>
            <h3 className="text-xl font-bold text-[#2D3E35] mb-2 tracking-tight">Analyzing Your Flow</h3>
            <p className="text-slate-400 font-light px-12 text-[15px] leading-relaxed">
              AI insights will appear here as we monitor your performance. We'll optimize your path every 24 hours based on your accuracy and focus.
            </p>
          </div>
        )}
      </div>

      <div className="mt-16 p-8 rounded-[32px] bg-[#2D3E35] text-white shadow-xl shadow-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#8FB38F] animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8FB38F]">Groq Intelligence</span>
        </div>
        <p className="text-[14px] leading-relaxed font-light text-slate-200">
          <strong>Transparency Note:</strong> Adapta AI monitors your quiz accuracy, focus time, and subjective feedback to recalibrate your plan. Your path is uniquely tailored to your pace.
        </p>
      </div>
    </div>
  );
};

export default InsightsPanel;
