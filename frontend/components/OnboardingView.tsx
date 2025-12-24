
import React, { useState } from 'react';
import { OnboardingData } from '../types';

interface OnboardingViewProps {
  onComplete: (data: OnboardingData) => void;
  onLogout: () => void;
  initialData?: OnboardingData | null;
  onExamModeRequest: () => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onLogout, initialData, onExamModeRequest }) => {
  const [step, setStep] = useState<'mode' | 'details' | 'learning-style'>('mode');
  const [data, setData] = useState<OnboardingData>(initialData || {
    mode: 'exam',
    planType: 'balanced',
    hoursPerDay: 4
  } as OnboardingData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectMode = (mode: 'exam' | 'skill') => {
    setData({ ...data, mode });
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'details') setStep('mode');
    if (step === 'learning-style') setStep('details');
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('learning-style');
  };

  const handleFinish = (style: 'Flashcards' | 'Analogies' | 'Practice' | 'Mixed') => {
    setIsSubmitting(true);
    const finalData = { ...data, learningStyle: style };
    onComplete(finalData);
  };

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#FBFCFB]">
        <div className="w-12 h-12 border-4 border-[#EAF0EA] border-t-[#5F855F] rounded-full animate-spin mb-8"></div>
        <h2 className="text-3xl font-bold text-[#2D3E35] tracking-tight mb-3">Generating your plan...</h2>
        <p className="text-slate-400 font-light max-w-sm mx-auto leading-relaxed">Gemini is analyzing your goals to minimize your cognitive load.</p>
      </div>
    );
  }

  const PlanTypeSelector = () => (
    <div>
      <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Plan Intensity</label>
      <div className="flex gap-3">
        {['balanced', 'intense'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setData({ ...data, planType: type as any })}
            className={`flex-1 py-4 px-4 rounded-[20px] text-sm font-bold border transition-all ${data.planType === type ? 'bg-[#5F855F] text-white border-[#5F855F] shadow-md' : 'bg-white text-slate-400 border-[#E8EDE8] hover:border-[#5F855F]/30'
              }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-16 px-6 animate-fade-in bg-[#FBFCFB]">
      <header className="mb-14 text-center">
        <div className="w-16 h-16 bg-[#5F855F] rounded-3xl flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold shadow-[0_10px_20px_rgba(95,133,95,0.2)]">S</div>
        <h1 className="text-3xl font-bold text-[#2D3E35] mb-2 tracking-tight">Focus your journey</h1>
        <p className="text-slate-400 font-light mb-6">Choose how you'd like to prepare today.</p>
        <button
          onClick={onLogout}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8FB38F] hover:text-red-400 transition-all active:scale-95"
        >
          Sign Out
        </button>
      </header>

      {step === 'mode' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <button
            onClick={() => selectMode('exam')}
            className="group p-8 bg-white border border-[#E8EDE8] rounded-[32px] text-center hover:border-[#5F855F] hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">🎯</div>
            <h3 className="text-xl font-bold text-[#2D3E35] mb-2 tracking-tight">Exam Prep</h3>
            <p className="text-slate-400 font-light text-[14px] leading-relaxed">Targeted syllabus coverage for an upcoming deadline.</p>
          </button>

          <button
            onClick={() => selectMode('skill')}
            className="group p-8 bg-white border border-[#E8EDE8] rounded-[32px] text-center hover:border-[#5F855F] hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">🌱</div>
            <h3 className="text-xl font-bold text-[#2D3E35] mb-2 tracking-tight">Skill Building</h3>
            <p className="text-slate-400 font-light text-[14px] leading-relaxed">Self-paced learning to master a new craft or topic.</p>
          </button>
        </div>
      )}

      {step === 'details' && (
        <div className="animate-fade-in">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[#8FB38F] hover:text-[#5F855F] mb-6 transition-colors group px-2"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-widest">Change Mode</span>
          </button>

          {data.mode === 'exam' ? (
            <form onSubmit={handleNextStep} className="bg-white p-10 border border-[#E8EDE8] rounded-[40px] shadow-sm space-y-7">
              <h2 className="text-2xl font-bold text-[#2D3E35] tracking-tight mb-2">Exam Details</h2>

              <div>
                <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Academic Level</label>
                <input
                  required
                  className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:ring-4 focus:ring-[#5F855F]/5 focus:border-[#5F855F] transition-all text-slate-700 placeholder:text-slate-300"
                  placeholder="e.g. College Freshman, GRE Student"
                  onChange={(e) => setData({ ...data, level: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Syllabus Scope</label>
                <textarea
                  required
                  className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:ring-4 focus:ring-[#5F855F]/5 focus:border-[#5F855F] min-h-[120px] transition-all text-slate-700 placeholder:text-slate-300"
                  placeholder="e.g. Quantum Physics basics, Organic Chemistry..."
                  onChange={(e) => setData({ ...data, syllabus: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Deadline</label>
                  <input
                    required
                    type="date"
                    className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:border-[#5F855F] transition-all text-slate-700"
                    onChange={(e) => setData({ ...data, examDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Daily Cap</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="12"
                    className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:border-[#5F855F] transition-all text-slate-700"
                    placeholder="4 hrs"
                    onChange={(e) => setData({ ...data, hoursPerDay: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <PlanTypeSelector />

              <button
                type="submit"
                className="w-full bg-[#5F855F] text-white py-4.5 rounded-[22px] font-bold text-[15px] hover:bg-[#4E6D4E] transition-all shadow-[0_10px_20px_rgba(95,133,95,0.15)] active:scale-[0.98] mt-4"
              >
                Assemble Plan
              </button>
            </form>
          ) : (
            <form onSubmit={handleNextStep} className="bg-white p-10 border border-[#E8EDE8] rounded-[40px] shadow-sm space-y-7">
              <h2 className="text-2xl font-bold text-[#2D3E35] tracking-tight mb-2">Skill Goal</h2>

              <div>
                <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Fluency Target</label>
                <input
                  required
                  className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:ring-4 focus:ring-[#5F855F]/5 focus:border-[#5F855F] transition-all text-slate-700 placeholder:text-slate-300"
                  placeholder="e.g. Mid-level mastery"
                  onChange={(e) => setData({ ...data, level: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Skill Area</label>
                <input
                  required
                  className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:ring-4 focus:ring-[#5F855F]/5 focus:border-[#5F855F] transition-all text-slate-700 placeholder:text-slate-300"
                  placeholder="e.g. Modern UI Design with Figma"
                  onChange={(e) => setData({ ...data, skill: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Duration</label>
                  <input
                    required
                    className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:border-[#5F855F] transition-all text-slate-700"
                    placeholder="e.g. 8 weeks"
                    onChange={(e) => setData({ ...data, skillDuration: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Daily Cap</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="12"
                    className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:border-[#5F855F] transition-all text-slate-700"
                    placeholder="2 hrs"
                    onChange={(e) => setData({ ...data, hoursPerDay: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <PlanTypeSelector />

              <button
                type="submit"
                className="w-full bg-[#5F855F] text-white py-4.5 rounded-[22px] font-bold text-[15px] hover:bg-[#4E6D4E] transition-all shadow-[0_10px_20px_rgba(95,133,95,0.15)] active:scale-[0.98] mt-4"
              >
                Assemble Plan
              </button>
            </form>
          )}
        </div>
      )}

      {step === 'learning-style' && (
        <div className="animate-fade-in">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[#8FB38F] hover:text-[#5F855F] mb-8 transition-colors group px-2"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-widest">Back to Details</span>
          </button>

          <h2 className="text-2xl font-bold text-[#2D3E35] mb-10 px-2 text-center tracking-tight">How do you learn best?</h2>

          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'Mixed', title: 'Equally (Default)', desc: 'Balanced mix of theory, examples, and recall point.', icon: '⚖️' },
              { id: 'Flashcards', title: 'Recall Driven', desc: 'Short Q&A, definitions, and key facts for memory.', icon: '🃏' },
              { id: 'Analogies', title: 'Analogy Heavy', desc: 'Intuitive everyday examples for conceptual clarity.', icon: '💡' },
              { id: 'Practice', title: 'Practice First', desc: 'Worked examples and step-by-step problem solving.', icon: '✍️' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => handleFinish(style.id as any)}
                className="flex items-center gap-6 p-6 bg-white border border-[#E8EDE8] rounded-[32px] text-left hover:border-[#5F855F] hover:shadow-xl transition-all group active:scale-[0.99]"
              >
                <div className="text-3xl bg-[#F1F5F1] w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">{style.icon}</div>
                <div>
                  <h3 className="text-lg font-bold text-[#2D3E35] mb-1 tracking-tight">{style.title}</h3>
                  <p className="text-slate-400 font-light text-sm leading-relaxed">{style.desc}</p>
                </div>
                <div className="ml-auto w-8 h-8 rounded-full border border-[#E8EDE8] group-hover:bg-[#5F855F] group-hover:border-[#5F855F] transition-all flex items-center justify-center">
                  <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingView;
