import React from 'react';
import { OnboardingData } from '../types';
import adaptaLogo from '../assets/adapta-logo.png';

interface SidebarProps {
    plans: OnboardingData[];
    currentPlan: OnboardingData | null;
    onSelectPlan: (plan: OnboardingData) => void;
    onNewPlan: () => void;
    onViewLibrary: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps & { isCollapsed?: boolean; onToggleCollapse?: () => void }> = ({
    plans,
    currentPlan,
    onSelectPlan,
    onNewPlan,
    onViewLibrary,
    isOpen,
    onToggle,
    isCollapsed = false,
    onToggleCollapse
}) => {
    const examPlans = plans.filter(p => p.mode === 'exam');
    const skillPlans = plans.filter(p => p.mode === 'skill');

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onToggle}
            />

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 h-screen bg-white/80 backdrop-blur-xl border-r border-slate-100 shadow-2xl md:shadow-none z-50 transition-all duration-300 ease-spring 
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${isCollapsed ? 'md:w-20' : 'md:w-72'} w-72
                `}
            >
                <div className="flex flex-col h-full p-4 md:p-6 relative">
                    {/* Collapse Toggle Button (Desktop Only) */}
                    <button
                        onClick={onToggleCollapse}
                        className="hidden md:flex absolute -right-3 top-24 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm hover:shadow-md transition-all z-50 active:scale-90"
                    >
                        <svg className={`w-3 h-3 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Header */}
                    <div className={`flex items-center gap-3 mb-10 px-2 mt-14 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--sage-primary)]/10 flex items-center justify-center p-2">
                            <img src={adaptaLogo} alt="Adapta AI" className="w-full h-full object-contain" />
                        </div>
                        <span className={`text-sm font-bold tracking-[0.1em] text-slate-900 uppercase transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                            Adapta
                        </span>
                    </div>

                    <div className="space-y-8 flex-1 overflow-y-auto no-scrollbar">
                        {/* Exam Section */}
                        <div>
                            <h3 className={`text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-2 flex items-center gap-2 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
                                <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0"></span>
                                <span className={isCollapsed ? 'hidden' : 'block'}>Exam Mode</span>
                            </h3>
                            <div className="space-y-1">
                                {examPlans.map((plan, idx) => {
                                    const isActive = currentPlan === plan;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                onSelectPlan(plan);
                                                if (window.innerWidth < 768) onToggle();
                                            }}
                                            title={isCollapsed ? (plan.level || 'Exam') : ''}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden flex items-center ${isActive
                                                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                                        >
                                            <span className={`relative z-10 truncate ${isCollapsed ? 'hidden' : 'block'}`}>{plan.level || 'Untitled Exam'}</span>
                                            {isCollapsed && <span className="text-xl">🎯</span>}
                                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Skill Section */}
                        <div>
                            <h3 className={`text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-2 flex items-center gap-2 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
                                <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0"></span>
                                <span className={isCollapsed ? 'hidden' : 'block'}>Skill Build</span>
                            </h3>
                            <div className="space-y-1">
                                {skillPlans.map((plan, idx) => {
                                    const isActive = currentPlan === plan;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                onSelectPlan(plan);
                                                if (window.innerWidth < 768) onToggle();
                                            }}
                                            title={isCollapsed ? (plan.skill || 'Skill') : ''}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden flex items-center ${isActive
                                                ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                                        >
                                            <span className={`relative z-10 truncate ${isCollapsed ? 'hidden' : 'block'}`}>{plan.skill || 'Untitled Skill'}</span>
                                            {isCollapsed && <span className="text-xl">🌱</span>}
                                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer / New Plan Action */}
                    <div className="pt-6 border-t border-slate-100">
                        <button
                            onClick={() => {
                                onNewPlan();
                                if (window.innerWidth < 768) onToggle();
                            }}
                            title={isCollapsed ? 'Add New Plan' : ''}
                            className={`w-full py-3 px-4 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs font-bold uppercase tracking-wider hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 mb-2 ${isCollapsed ? 'px-0' : ''}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span className={isCollapsed ? 'hidden' : 'block'}>Add New</span>
                        </button>

                        <button
                            onClick={() => {
                                onViewLibrary();
                                if (window.innerWidth < 768) onToggle();
                            }}
                            className={`w-full py-2 text-center text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest ${isCollapsed ? 'hidden' : 'block'}`}
                        >
                            Open Full Library
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
