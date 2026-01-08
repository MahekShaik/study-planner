import React from 'react';
import { WavyBackground } from './ui/wavy-background';
import adaptaLogo from '../assets/adapta-logo.png';

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
    return (
        <div className="min-h-screen bg-black font-sans text-slate-100 overflow-x-hidden">
            {/* Hero Section */}
            <section className="relative h-screen flex flex-col">
                <nav className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <img src={adaptaLogo} alt="Adapta AI" className="w-14 h-14 object-contain" />
                        <span className="text-sm font-bold tracking-[0.2em] uppercase text-white shadow-sm">Adapta AI</span>
                    </div>
                    <button
                        onClick={onLogin}
                        className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-bold backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all"
                    >
                        Log In
                    </button>
                </nav>

                <WavyBackground className="max-w-4xl mx-auto pb-40 flex flex-col items-center px-4" containerClassName="h-screen" colors={['#71b48d', '#86cb92', '#404e7c', '#251f47', '#260f26']}>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl text-white font-bold text-center tracking-tight mb-6 drop-shadow-lg">
                        Master Any Topic.<br />
                        <span className="text-emerald-200">Without the Stress.</span>
                    </h1>
                    <p className="text-base md:text-xl text-white/90 font-light text-center max-w-xl mx-auto leading-relaxed mb-10 drop-shadow-md">
                        AI-powered study plans that adapt to your pace. Reduce cognitive load, improve retention, and achieve mastery with a plan designed just for you.
                    </p>
                    <button
                        onClick={onGetStarted}
                        className="px-10 py-4 bg-white text-[#251f47] rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    >
                        Start Your Journey
                    </button>
                </WavyBackground>
            </section>

            {/* Features Section */}
            <section className="py-24 px-6 bg-zinc-950/50 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-3">Why Adapta?</h2>
                        <h3 className="text-3xl md:text-4xl font-bold text-white">Precision Learning, Zero Burnout.</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: "Smart Replanning", desc: "Life happens. Missed a day? Our AI automatically adjusts your schedule to keep you on track without the guilt.", icon: "🔄" },
                            { title: "AI Tutor Support", desc: "Stuck on a concept? Get 24/7 personalized explanations and examples tailored to your learning style.", icon: "🤖" },
                            { title: "Progress Checks", desc: "Regular quizzes ensure you've truly mastered topics before moving on, reinforcing long-term retention.", icon: "✅" }
                        ].map((feature, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-lg p-8 rounded-[32px] border border-white/10 shadow-xl hover:bg-white/10 hover:-translate-y-1 transition-all group">
                                <div className="text-5xl mb-6 bg-emerald-500/10 w-20 h-20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">{feature.icon}</div>
                                <h4 className="text-xl font-bold text-white mb-3">{feature.title}</h4>
                                <p className="text-slate-400 font-light leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-6 bg-black overflow-hidden">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
                    </div>

                    <div className="space-y-4">
                        {[
                            { q: "How does the AI create my plan?", a: "We analyze your syllabus, exam date, and available daily hours to create a balanced schedule. It breaks down complex topics into manageable daily goals." },
                            { q: "Can I change my plan later?", a: "Absolutely! You can regenerate your plan at any time if your exam date changes or if you want to switch between 'Balanced' and 'Intense' modes." },
                            { q: "What happens if I miss a task?", a: "No stress. Just mark it as pending, and our Smart Replanning feature will automatically redistribute the work over the remaining days." },
                            { q: "Is the AI Tutor really 24/7?", a: "Yes, our AI assistant is always available to answer doubts, provide analogies, or quiz you on specific topics whenever you need help." }
                        ].map((faq, i) => (
                            <details key={i} className="group bg-slate-900/40 rounded-2xl border border-white/5 open:bg-slate-900/60 open:shadow-2xl open:border-emerald-500/30 transition-all duration-300">
                                <summary className="flex justify-between items-center cursor-pointer p-6 list-none text-lg font-medium text-slate-200">
                                    {faq.q}
                                    <span className="transform group-open:rotate-180 transition-transform duration-300 text-emerald-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </span>
                                </summary>
                                <div className="px-6 pb-6 text-slate-400 leading-relaxed animate-fade-in">
                                    {faq.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Founders Section */}
            <section className="py-24 px-6 bg-black border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-white mb-4">Meet the Team</h2>
                        <p className="text-slate-500 font-light">The minds behind Adapta AI.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { name: "Ishita Puranik", email: "ishitapurk14@gmail.com", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                            { name: "Spoorthi Chava", email: "spoorthichava06@gmail.com", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                            { name: "Geethanjali Bathini", email: "geethanjalibathini7@gmail.com", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                            { name: "Mahek Muskaan Shaik", email: "mahekm.shaik@gmail.com", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" }
                        ].map((founder, idx) => (
                            <div key={idx} className="group text-center">
                                <div className={`w-32 h-32 mx-auto rounded-full mb-6 flex items-center justify-center text-3xl font-bold border ${founder.color} transition-all group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]`}>
                                    {founder.name.charAt(0)}
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{founder.name}</h4>
                                <a href={`mailto:${founder.email}`} className="text-xs text-slate-500 font-medium hover:text-emerald-400 transition-colors">
                                    {founder.email}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="py-12 bg-black text-white/30 text-center border-t border-white/5">
                <div className="flex items-center justify-center gap-3 mb-4 opacity-50">
                    <img src={adaptaLogo} alt="Adapta AI" className="w-10 h-10 object-contain" />
                    <span className="text-xs font-bold tracking-[0.2em] uppercase text-white">Adapta AI</span>
                </div>
                <p className="text-[10px]">© 2026 Adapta. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
