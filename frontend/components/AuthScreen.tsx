
import React, { useState } from 'react';

interface AuthScreenProps {
    onAuthSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
        const body = isLogin
            ? { email: formData.email, password: formData.password }
            : { name: formData.name, email: formData.email, password: formData.password };

        try {
            const response = await fetch(`${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Something went wrong');
                return;
            }

            if (isLogin) {
                localStorage.setItem('authToken', data.token);
                onAuthSuccess();
            } else {
                setSuccessMessage('Account created successfully! Please log in.');
                setFormData({ name: '', email: '', password: '' });
                setTimeout(() => {
                    setIsLogin(true);
                    setSuccessMessage('');
                }, 2000);
            }
        } catch (err: any) {
            setError(`Failed to connect to server: ${err.message}`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FBFCFB]">
            <div className="max-w-md w-full animate-fade-in">
                <header className="mb-12 text-center">
                    <div className="w-16 h-16 bg-[#5F855F] rounded-3xl flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold shadow-[0_10px_20px_rgba(95,133,95,0.2)]">S</div>
                    <h1 className="text-4xl font-bold text-[#2D3E35] mb-3 tracking-tight">SereneStudy</h1>
                    <p className="text-slate-400 font-light">Your AI-powered personalized academic partner.</p>
                </header>

                <div className="bg-white p-10 border border-[#E8EDE8] rounded-[40px] shadow-sm">
                    {/* Toggle between Login and Signup */}
                    <div className="flex gap-2 mb-10 p-1.5 bg-[#F1F5F1] rounded-[24px]">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(true);
                                setError('');
                                setSuccessMessage('');
                            }}
                            className={`flex-1 py-3.5 rounded-[20px] text-sm font-bold transition-all ${isLogin ? 'bg-white text-[#5F855F] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(false);
                                setError('');
                                setSuccessMessage('');
                            }}
                            className={`flex-1 py-3.5 rounded-[20px] text-sm font-bold transition-all ${!isLogin ? 'bg-white text-[#5F855F] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div>
                                <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:ring-4 focus:ring-[#5F855F]/5 focus:border-[#5F855F] transition-all text-slate-700 placeholder:text-slate-300"
                                    placeholder="Enter your name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Email Address</label>
                            <input
                                required
                                type="email"
                                className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:ring-4 focus:ring-[#5F855F]/5 focus:border-[#5F855F] transition-all text-slate-700 placeholder:text-slate-300"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-[#8FB38F] uppercase tracking-[0.2em] mb-3 ml-1">Password</label>
                            <input
                                required
                                type="password"
                                className="w-full p-4.5 border border-[#E8EDE8] rounded-[20px] bg-white focus:outline-none focus:ring-4 focus:ring-[#5F855F]/5 focus:border-[#5F855F] transition-all text-slate-700 placeholder:text-slate-300"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-[20px] text-red-600 text-[13px] font-medium animate-shake">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-4 bg-[#F1F5F1] border border-[#EAF0EA] rounded-[20px] text-[#5F855F] text-[13px] font-medium">
                                {successMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-[#5F855F] text-white py-4.5 rounded-[22px] font-bold text-[15px] hover:bg-[#4E6D4E] transition-all shadow-[0_10px_20px_rgba(95,133,95,0.15)] active:scale-[0.98] mt-4"
                        >
                            {isLogin ? 'Login to Space' : 'Create My Account'}
                        </button>
                    </form>
                </div>

                <p className="mt-12 text-center text-slate-400 text-xs font-light">
                    By continuing, you agree to our Terms of Service.
                </p>
            </div>
        </div>
    );
};

export default AuthScreen;
