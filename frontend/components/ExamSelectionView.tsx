import React from 'react';
import { OnboardingData, StudyTask } from '../types';
import { GlowCard } from './ui/spotlight-card';

interface ExamSelectionViewProps {
    plans: OnboardingData[];
    tasks: StudyTask[];
    onSelectPlan: (plan: OnboardingData) => void;
    onNewExam: () => void;
}

const ExamSelectionView: React.FC<ExamSelectionViewProps> = ({ plans, tasks, onSelectPlan, onNewExam }) => {
    return (
        <div className="max-w-4xl mx-auto py-16 px-6 animate-fade-in bg-[var(--bg-main)]">
            <header className="mb-14 flex justify-between items-end">
                <div>
                    <h2 className="text-[var(--accent-blue)] text-xs font-bold uppercase tracking-[0.2em] mb-2">My Library</h2>
                    <h1 className="text-4xl font-bold text-[var(--primary)] tracking-tight">Your Exams</h1>
                    <p className="text-slate-400 font-light mt-1">Select an exam to view your daily plan.</p>
                </div>
                <button
                    onClick={onNewExam}
                    className="bg-[var(--sage-primary)] text-white py-5 px-10 rounded-2xl font-bold text-base hover:opacity-90 transition-all shadow-lg flex items-center gap-2 active:scale-95"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    New Exam
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map((plan, idx) => {
                    const title = plan.level || plan.skill || 'Untitled Plan';
                    const subtitle = plan.mode === 'exam' ? 'Exam Prep' : 'Skill Building';

                    const planTasks = tasks.filter(t =>
                        plan.level === t.subject ||
                        plan.skill === t.subject ||
                        (plan.syllabus && plan.syllabus.includes(t.subject))
                    );
                    const completed = planTasks.filter(t => t.status === 'completed').length;
                    const total = planTasks.length;
                    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                    const isStarted = planTasks.some(t => t.status !== 'pending');
                    const isCompleted = total > 0 && completed === total;
                    const statusText = isCompleted ? 'Completed' : isStarted ? 'In Progress' : 'Not Started';
                    const statusColor = isCompleted ? 'bg-[var(--sage-light)] text-[var(--primary)]' : isStarted ? 'bg-[#FDFBEB] text-[#B89B2E]' : 'bg-slate-50 text-slate-400';

                    return (
                        <GlowCard
                            key={idx}
                            onClick={() => onSelectPlan(plan)}
                            customSize={true}
                            glowColor="purple"
                            className="group text-left p-10 cursor-pointer hover:shadow-2xl transition-all duration-500 flex flex-col h-full active:scale-[0.98] w-full"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="flex-1 w-full relative z-10">
                                <div className="flex justify-between items-center mb-5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-blue)]">
                                        {subtitle}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full ${statusColor}`}>
                                        {statusText}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-[var(--primary)] mb-2 group-hover:text-[var(--sage-primary)] transition-colors tracking-tight leading-tight">
                                    {title}
                                </h3>
                                <p className="text-slate-400 text-sm font-light mb-8">
                                    {plan.examDate ? `Target: ${new Date(plan.examDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Self-Paced Learning'}
                                </p>

                                {total > 0 && (
                                    <div className="mb-0">
                                        <div className="flex justify-between items-end mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-[var(--sage-primary)] uppercase tracking-[0.15em] mb-1">Current Progress</span>
                                                <span className="text-[11px] text-slate-400">{completed} of {total} topics mastered</span>
                                            </div>
                                            <span className="text-xs font-bold text-[var(--primary)] bg-[var(--sage-light)]/20 px-2 py-0.5 rounded-lg">{progress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--sage-primary)] transition-all duration-1000 ease-out"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between w-full relative z-10">
                                <span className="text-base font-bold text-[var(--sage-primary)] group-hover:translate-x-1 transition-transform flex items-center gap-2">
                                    {isStarted ? 'Resume Study' : 'Start Preparation'}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </div>
                        </GlowCard>
                    );
                })}

                {plans.length === 0 && (
                    <div className="col-span-full py-28 text-center bg-white border border-dashed border-[var(--sage-border)] rounded-[48px]">
                        <div className="text-5xl mb-6 grayscale opacity-20">📚</div>
                        <h3 className="text-xl font-bold text-[var(--primary)] mb-2 tracking-tight">Library is Empty</h3>
                        <p className="text-slate-400 font-light px-12 text-[15px] max-w-sm mx-auto leading-relaxed">
                            Start your personalized journey by creating your first exam preparation plan.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamSelectionView;
