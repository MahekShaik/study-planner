

import React, { useState } from 'react';
import { OnboardingData } from '../types';
import Carousel from './Carousel';
import adaptaLogo from '../assets/adapta-logo.png';

interface OnboardingViewProps {
  onComplete: (data: OnboardingData) => void;
  onLogout: () => void;
  initialData?: OnboardingData | null;
  onExamModeRequest: () => void;
  userDailyHours?: number;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onLogout, initialData, onExamModeRequest, userDailyHours = 4 }) => {
  const [step, setStep] = useState<'mode' | 'details' | 'learning-style'>('mode');
  const [data, setData] = useState<OnboardingData>(initialData || {
    mode: 'exam',
    planType: 'balanced',
    hoursPerDay: userDailyHours
  } as OnboardingData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const selectMode = (mode: 'exam' | 'skill') => {
    // Reset fields relevant to specific modes to prevent data leakage (e.g. syllabus files from exam mode leaking to skill mode)
    if (mode === 'exam') {
      setData({
        mode: 'exam',
        level: '',
        skill: '', // clear skill
        skillDuration: '', // clear duration
        syllabus: '',
        syllabusFiles: [], // Clear files
        examDate: '',
        planType: 'balanced',
        hoursPerDay: userDailyHours,
        learningStyle: data.learningStyle
      } as OnboardingData);
    } else {
      setData({
        mode: 'skill',
        level: '', // clear fluency target
        skill: '',
        skillDuration: '4 weeks', // default
        syllabus: '', // clear syllabus
        syllabusFiles: [], // Clear files
        examDate: '', // clear exam date
        planType: 'balanced',
        hoursPerDay: userDailyHours,
        learningStyle: data.learningStyle
      } as OnboardingData);
    }
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const currentFiles = data.syllabusFiles || [];
    if (currentFiles.length + selectedFiles.length > 10) {
      alert("You can upload a maximum of 10 files.");
      return;
    }

    setIsUploading(true);
    const newFiles: { name: string, data: string, type: string }[] = [...currentFiles];
    let processedCount = 0;

    Array.from(selectedFiles).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const base64Content = event.target?.result as string;
        if (!base64Content) {
          processedCount++;
          if (processedCount === selectedFiles.length) setIsUploading(false);
          return;
        }

        // Extract pure base64 if it's a data URL
        const base64Data = base64Content.includes('base64,') ? base64Content.split('base64,')[1] : base64Content;

        newFiles.push({
          name: file.name,
          data: base64Data,
          type: file.type || 'application/octet-stream'
        });

        processedCount++;
        if (processedCount === selectedFiles.length) {
          setData(prev => ({ ...prev, syllabusFiles: newFiles }));
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        processedCount++;
        if (processedCount === selectedFiles.length) setIsUploading(false);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    const currentFiles = data.syllabusFiles || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);
    setData({ ...data, syllabusFiles: newFiles });
  };


  if (isSubmitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-main)]">
        <div className="w-12 h-12 border-4 border-[var(--sage-light)] border-t-[var(--sage-primary)] rounded-full animate-spin mb-8"></div>
        <h2 className="text-3xl font-bold text-[var(--primary)] tracking-tight mb-3">Generating your plan...</h2>
        <p className="text-slate-400 font-light max-w-sm mx-auto leading-relaxed">
          <strong>Transparency Note:</strong> Adapta AI monitors your quiz accuracy, focus time, and subjective feedback to recalibrate your plan. Your path is uniquely tailored to your pace.
        </p>
      </div>
    );
  }

  const PlanTypeSelector = () => (
    <div>
      <label className="block text-xs font-bold text-[var(--sage-primary)] uppercase tracking-[0.2em] mb-3 ml-1">Plan Intensity</label>
      <div className="flex gap-3">
        {['balanced', 'intense'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setData({ ...data, planType: type as any })}
            className={`flex-1 py-4 px-4 rounded-[20px] text-sm font-bold border transition-all ${data.planType === type ? 'bg-[var(--sage-primary)] text-white border-[var(--sage-primary)] shadow-md' : 'bg-white text-slate-400 border-[var(--sage-border)] hover:border-[var(--sage-primary)]/30'
              }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-16 px-6 animate-fade-in bg-[var(--bg-main)]">
      <header className="mb-14 text-center">
        <img src={adaptaLogo} alt="Adapta AI" className="w-28 h-28 mx-auto mb-6 object-contain opacity-90" />
        <h1 className="text-4xl font-bold text-[var(--primary)] mb-2 tracking-tight">Focus your journey</h1>
        <p className="text-slate-400 font-light mb-6 text-lg">Choose how you'd like to prepare today.</p>
        <div className="flex justify-center gap-6">
          {onExamModeRequest && (
            <button
              onClick={onExamModeRequest}
              className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sage-primary)] hover:text-[#5F855F] transition-all active:scale-95"
            >
              View My Plans
            </button>
          )}
          <button
            onClick={onLogout}
            className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-red-400 transition-all active:scale-95"
          >
            Sign Out
          </button>
        </div>
      </header>

      {step === 'mode' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <button
            onClick={() => selectMode('exam')}
            className="group p-8 bg-white border border-[var(--sage-border)] rounded-[32px] text-center hover:border-[var(--sage-primary)] hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">🎯</div>
            <h3 className="text-xl font-bold text-[var(--primary)] mb-2 tracking-tight">Exam Prep</h3>
            <p className="text-slate-400 font-light text-[14px] leading-relaxed">Targeted syllabus coverage for an upcoming deadline.</p>
          </button>

          <button
            onClick={() => selectMode('skill')}
            className="group p-8 bg-white border border-[var(--sage-border)] rounded-[32px] text-center hover:border-[var(--sage-primary)] hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">🌱</div>
            <h3 className="text-xl font-bold text-[var(--primary)] mb-2 tracking-tight">Skill Building</h3>
            <p className="text-slate-400 font-light text-[14px] leading-relaxed">Self-paced learning to master a new craft or topic.</p>
          </button>
        </div>
      )}

      {step === 'details' && (
        <div className="animate-fade-in">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[var(--sage-primary)] hover:text-[#5F855F] mb-6 transition-colors group px-2"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest">Change Mode</span>
          </button>

          {data.mode === 'exam' ? (
            <form onSubmit={handleNextStep} className="bg-white p-10 border border-[#E8EDE8] rounded-[40px] shadow-sm space-y-7">
              <h2 className="text-2xl font-bold text-[var(--primary)] tracking-tight mb-2">Exam Details</h2>

              <div>
                <label className="block text-xs font-bold text-[var(--sage-primary)] uppercase tracking-[0.2em] mb-3 ml-1">Academic Level</label>
                <div className="space-y-3">
                  <select
                    required
                    className="w-full p-5 border border-[var(--sage-border)] rounded-[24px] bg-white focus:outline-none focus:ring-4 focus:ring-[var(--sage-primary)]/10 focus:border-[var(--sage-primary)] transition-all text-slate-700 text-lg appearance-none cursor-pointer"
                    value={['High School', 'Undergraduate', 'Postgraduate', 'Professional Certification', 'Lifelong Learner'].includes(data.level) ? data.level : (data.level ? 'Other' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        setData({ ...data, level: ' ' });
                      } else {
                        setData({ ...data, level: val });
                      }
                    }}
                  >
                    <option value="" disabled>Select your level</option>
                    <option value="High School">High School</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Professional Certification">Professional Certification</option>
                    <option value="Lifelong Learner">Lifelong Learner</option>
                    <option value="Other">Other (Custom)</option>
                  </select>

                  {(!['High School', 'Undergraduate', 'Postgraduate', 'Professional Certification', 'Lifelong Learner'].includes(data.level) && (data.level === ' ' || (data.level && data.level.length > 0))) && (
                    <input
                      autoFocus
                      required
                      className="w-full p-5 border border-[var(--sage-border)] rounded-[24px] bg-white focus:outline-none focus:ring-4 focus:ring-[var(--sage-primary)]/10 focus:border-[var(--sage-primary)] transition-all text-slate-700 placeholder:text-slate-300 text-lg animate-fade-in"
                      placeholder="Type your specific level..."
                      value={['High School', 'Undergraduate', 'Postgraduate', 'Professional Certification', 'Lifelong Learner'].includes(data.level) ? '' : (data.level === ' ' ? '' : data.level)}
                      onChange={(e) => setData({ ...data, level: e.target.value })}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--sage-primary)] uppercase tracking-[0.2em] mb-3 ml-1">Syllabus Scope</label>
                <textarea
                  required
                  className="w-full p-5 border border-[var(--sage-border)] rounded-[24px] bg-white focus:outline-none focus:ring-4 focus:ring-[var(--sage-primary)]/10 focus:border-[var(--sage-primary)] min-h-[120px] transition-all text-slate-700 placeholder:text-slate-300 text-lg"
                  placeholder="e.g. Quantum Physics basics, Organic Chemistry..."
                  onChange={(e) => setData({ ...data, syllabus: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--sage-primary)] uppercase tracking-[0.2em] mb-3 ml-1">Syllabus Documents (Optional - Max 10)</label>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="syllabus-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="syllabus-upload"
                      className={`flex items-center justify-center gap-3 w-full p-5 border-2 border-dashed border-[var(--sage-border)] rounded-[24px] cursor-pointer hover:border-[var(--sage-primary)] hover:bg-[var(--sage-primary)]/5 transition-all text-slate-500 font-medium ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {isUploading ? 'Processing files...' : 'Upload PDF, PowerPoint, Word or Images'}
                    </label>
                  </div>

                  {data.syllabusFiles && data.syllabusFiles.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto no-scrollbar p-2">
                      {data.syllabusFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm animate-fade-in shadow-sm">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-xl">
                              {file.type.includes('image') ? '🖼️' : file.type.includes('pdf') ? '📄' : file.type.includes('presentation') ? '📊' : '📁'}
                            </span>
                            <span className="truncate text-slate-600 font-medium">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--sage-primary)] uppercase tracking-[0.2em] mb-3 ml-1">Deadline</label>
                <input
                  required
                  type="date"
                  className="w-full p-5 border border-[var(--sage-border)] rounded-[24px] bg-white focus:outline-none focus:border-[var(--sage-primary)] transition-all text-slate-700 text-lg"
                  onChange={(e) => setData({ ...data, examDate: e.target.value })}
                />
              </div>


              <PlanTypeSelector />

              <button
                type="submit"
                className="w-full bg-[var(--sage-primary)] text-white py-5 rounded-[28px] font-bold text-lg hover:bg-[#65a880] transition-all shadow-xl active:scale-[0.98] mt-6"
              >
                Assemble Plan
              </button>
            </form>
          ) : (
            <form onSubmit={handleNextStep} className="bg-white p-10 border border-[#E8EDE8] rounded-[40px] shadow-sm space-y-7">
              <h2 className="text-2xl font-bold text-[#2D3E35] tracking-tight mb-2">Skill Goal</h2>

              <div>
                <label className="block text-xs font-bold text-[var(--sage-primary)] uppercase tracking-[0.2em] mb-3 ml-1">Fluency Target</label>
                <select
                  required
                  className="w-full p-5 border border-[var(--sage-border)] rounded-[24px] bg-white focus:outline-none focus:ring-4 focus:ring-[var(--sage-primary)]/10 focus:border-[var(--sage-primary)] transition-all text-slate-700 text-lg appearance-none cursor-pointer"
                  value={data.level || ''}
                  onChange={(e) => setData({ ...data, level: e.target.value })}
                >
                  <option value="" disabled>Select your goal level</option>
                  <option value="Beginner">Beginner (Foundations)</option>
                  <option value="Intermediate">Intermediate (Competent)</option>
                  <option value="Advanced">Advanced (Expert)</option>
                  <option value="Mastery">Mastery (World Class)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--sage-primary)] uppercase tracking-[0.2em] mb-3 ml-1">Skill Area</label>
                <input
                  required
                  className="w-full p-5 border border-[var(--sage-border)] rounded-[24px] bg-white focus:outline-none focus:ring-4 focus:ring-[var(--sage-primary)]/10 focus:border-[var(--sage-primary)] transition-all text-slate-700 placeholder:text-slate-300 text-lg"
                  placeholder="e.g. Modern UI Design with Figma"
                  onChange={(e) => setData({ ...data, skill: e.target.value })}
                  value={data.skill || ''}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--sage-primary)] uppercase tracking-[0.2em] mb-3 ml-1">Duration (Weeks)</label>
                <div className="flex items-center gap-4 bg-white p-2 border border-[var(--sage-border)] rounded-[24px]">
                  <button
                    type="button"
                    onClick={() => {
                      const currentWeeks = parseInt(data.skillDuration?.split(' ')[0] || '4');
                      const newWeeks = Math.max(1, currentWeeks - 1);
                      setData({ ...data, skillDuration: `${newWeeks} weeks` });
                    }}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-[var(--sage-primary)] hover:bg-[var(--sage-primary)] hover:text-white transition-all font-bold text-xl"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-[var(--primary)]">
                      {parseInt(data.skillDuration?.split(' ')[0] || '4')}
                    </span>
                    <span className="text-sm text-slate-400 font-medium ml-2">weeks</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentWeeks = parseInt(data.skillDuration?.split(' ')[0] || '4');
                      const newWeeks = Math.min(52, currentWeeks + 1);
                      setData({ ...data, skillDuration: `${newWeeks} weeks` });
                    }}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-[var(--sage-primary)] hover:bg-[var(--sage-primary)] hover:text-white transition-all font-bold text-xl"
                  >
                    +
                  </button>
                </div>
              </div>

              <PlanTypeSelector />

              <button
                type="submit"
                className="w-full bg-[var(--sage-primary)] text-white py-5 rounded-[28px] font-bold text-lg hover:bg-[#65a880] transition-all shadow-xl active:scale-[0.98] mt-6"
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
            className="flex items-center gap-2 text-[var(--sage-primary)] hover:text-[#5F855F] mb-8 transition-colors group px-2"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-widest">Back to Details</span>
          </button>

          <h2 className="text-2xl font-bold text-[var(--primary)] mb-10 px-2 text-center tracking-tight">How do you learn best?</h2>

          <Carousel items={[
            { id: 'Mixed', title: 'Equally (Default)', desc: 'Balanced mix of theory, examples, and recall point.', icon: '⚖️' },
            { id: 'Flashcards', title: 'Recall Driven', desc: 'Short Q&A, definitions, and key facts for memory.', icon: '🃏' },
            { id: 'Analogies', title: 'Analogy Heavy', desc: 'Intuitive everyday examples for conceptual clarity.', icon: '💡' },
            { id: 'Practice', title: 'Practice First', desc: 'Worked examples and step-by-step problem solving.', icon: '✍️' }
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => handleFinish(style.id as any)}
              className="flex flex-col items-center justify-center gap-6 p-6 w-full text-center hover:bg-slate-50 transition-colors rounded-[32px] group"
            >
              <div className="text-6xl bg-[var(--bg-main)] w-32 h-32 rounded-[32px] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">{style.icon}</div>
              <div>
                <h3 className="text-2xl font-bold text-[var(--primary)] mb-2 tracking-tight">{style.title}</h3>
                <p className="text-slate-400 font-light text-base leading-relaxed max-w-xs mx-auto">{style.desc}</p>
              </div>
              <div className="mt-4 px-8 py-3 rounded-full bg-[var(--sage-primary)] text-white font-bold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                Select Style
              </div>
            </button>
          ))} />
        </div>
      )}
    </div>
  );
};

export default OnboardingView;
