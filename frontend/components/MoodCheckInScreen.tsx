import React, { useState } from 'react';

interface MoodCheckInScreenProps {
    onMoodSelected: (mood: string) => void;
    userName?: string;
}

const MoodCheckInScreen: React.FC<MoodCheckInScreenProps> = ({ onMoodSelected, userName }) => {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);

    const moods = [
        { emoji: '😴', label: 'Tired', value: 'tired', color: 'bg-indigo-100 text-indigo-600', hover: 'hover:bg-indigo-200' },
        { emoji: '😊', label: 'Fresh', value: 'fresh', color: 'bg-emerald-100 text-emerald-600', hover: 'hover:bg-emerald-200' },
        { emoji: '😐', label: 'Okay', value: 'okay', color: 'bg-slate-100 text-slate-600', hover: 'hover:bg-slate-200' },
        { emoji: '😌', label: 'Calm', value: 'calm', color: 'bg-sky-100 text-sky-600', hover: 'hover:bg-sky-200' },
        { emoji: '😰', label: 'Stressed', value: 'stressed', color: 'bg-orange-100 text-orange-600', hover: 'hover:bg-orange-200' }
    ];

    const handleConfirm = () => {
        if (selectedMood) {
            onMoodSelected(selectedMood);
        }
    };

    const getGreeting = () => {
        const hours = new Date().getHours();
        if (hours < 12) return 'Good morning';
        if (hours < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/30 backdrop-blur-xl animate-fade-in">
            <div className="w-full max-w-2xl p-8 bg-white border border-slate-100 rounded-[32px] shadow-2xl shadow-indigo-100/50 relative overflow-hidden">

                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

                <div className="relative z-10 text-center">
                    <div className="inline-block px-4 py-1 bg-slate-50 border border-slate-100 rounded-full mb-6">
                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Daily Check-in</span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3 tracking-tight">
                        {getGreeting()}{userName ? `, ${userName}` : ''}.
                    </h1>
                    <p className="text-slate-500 font-light text-lg mb-10 max-w-md mx-auto">
                        How are you feeling right now? Your response helps us tailor your study plan for today.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                        {moods.map((mood) => (
                            <button
                                key={mood.value}
                                onClick={() => setSelectedMood(mood.value)}
                                className={`group flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 
                  ${selectedMood === mood.value
                                        ? 'border-indigo-500 bg-white shadow-xl scale-105 z-10'
                                        : 'border-transparent bg-slate-50 hover:bg-white hover:shadow-lg hover:scale-[1.02]'
                                    }`}
                            >
                                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300 block">{mood.emoji}</span>
                                <span className={`text-xs font-bold uppercase tracking-wide transition-colors ${selectedMood === mood.value ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                    {mood.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className={`transition-all duration-500 overflow-hidden ${selectedMood ? 'opacity-100 max-h-20 translate-y-0' : 'opacity-0 max-h-0 translate-y-4'}`}>
                        <button
                            onClick={handleConfirm}
                            className="px-10 py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 mx-auto"
                        >
                            Start My Session
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MoodCheckInScreen;
