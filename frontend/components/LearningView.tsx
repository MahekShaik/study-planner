import React, { useState, useEffect } from 'react';
import { StudyTask } from '../types';
import { generateLearningContent } from '../services/geminiService';

interface LearningViewProps {
    task: StudyTask;
    onFinish: () => void;
    onBack: () => void;
    level: string;
    examDate?: string;
    learningStyle?: string;
    onUpdateProgress: (taskId: string, updates: Partial<StudyTask>) => void;
}

const LearningView: React.FC<LearningViewProps> = ({ task, onFinish, onBack, level, examDate, learningStyle, onUpdateProgress }) => {
    const [content, setContent] = useState<{ title: string; content: string }[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                if (task.status === 'pending') {
                    onUpdateProgress(task.id, { status: 'in_progress' });
                }

                const result = await generateLearningContent(task.subject, task.topic, level, examDate, learningStyle, task.sessionType);
                setContent(result.subparts);

                if (task.completedSubtopics && task.completedSubtopics.length > 0) {
                    const lastTitle = task.completedSubtopics[task.completedSubtopics.length - 1];
                    const resumeIndex = result.subparts.findIndex(p => p.title === lastTitle);
                    if (resumeIndex !== -1 && resumeIndex < result.subparts.length - 1) {
                        setCurrentIndex(resumeIndex + 1);
                    }
                }
            } catch (error) {
                console.error("Failed to generate content", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, [task]);

    const handleNext = () => {
        const currentTitle = content[currentIndex].title;
        const newCompleted = [...(task.completedSubtopics || [])];
        if (!newCompleted.includes(currentTitle)) {
            newCompleted.push(currentTitle);
        }

        if (currentIndex < content.length - 1) {
            onUpdateProgress(task.id, { completedSubtopics: newCompleted });
            setCurrentIndex(currentIndex + 1);
        } else {
            onUpdateProgress(task.id, {
                completedSubtopics: newCompleted,
                quizStatus: 'started'
            });
            onFinish();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in bg-[#FBFCFB]">
                <div className="w-12 h-12 border-4 border-[#EAF0EA] border-t-[#5F855F] rounded-full animate-spin mb-6"></div>
                <p className="text-slate-400 font-light text-sm">Preparing your session on {task.topic}...</p>
            </div>
        );
    }

    const currentPart = content[currentIndex];
    const progress = ((currentIndex + 1) / (content.length + 1)) * 100;

    return (
        <div className="max-w-4xl mx-auto py-10 px-6 animate-fade-in bg-[#FBFCFB]">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <h2 className="text-[#8FB38F] text-[11px] font-bold uppercase tracking-[0.2em]">{task.subject}</h2>
                        {task.sessionType === 'Revision' && (
                            <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
                                Revision Mode
                            </span>
                        )}
                    </div>
                    <h1 className="text-xl font-bold text-[#2D3E35] tracking-tight">{task.topic}</h1>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#EAF0EA] rounded-full h-1 mb-12 overflow-hidden">
                <div
                    className="bg-[#5F855F] h-1 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Content Card */}
            <div className="bg-white border border-[#E8EDE8] rounded-[32px] p-8 md:p-14 shadow-sm min-h-[450px] flex flex-col">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-8">
                        <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#EAF0EA] text-[#5F855F] font-bold text-xs">
                            {currentIndex + 1}
                        </span>
                        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{currentPart?.title}</h3>
                    </div>

                    <div className="prose prose-slate max-w-none">
                        <p className="text-slate-600 leading-relaxed text-[17px] font-light whitespace-pre-line">
                            {currentPart?.content}
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-14 pt-10 border-t border-slate-50">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${currentIndex === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        Back
                    </button>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 bg-[#5F855F] text-white px-10 py-3.5 rounded-2xl font-medium hover:bg-[#4E6D4E] transition-all shadow-[0_10px_20px_rgba(95,133,95,0.15)] active:scale-95"
                    >
                        {currentIndex === content.length - 1 ? (
                            <>
                                Take Quiz
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </>
                        ) : (
                            <>
                                Next Session
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LearningView;
