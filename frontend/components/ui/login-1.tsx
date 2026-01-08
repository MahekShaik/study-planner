/// <reference types="vite/client" />
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import adaptaLogo from '../../assets/adapta-logo.png';

interface LoginScreenProps {
    onAuthSuccess: (token: string) => void;
}

export default function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        dailyHours: 4
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
        // Use relative path to leverage Vite proxy
        const apiUrl = '';

        try {
            const body = isLogin
                ? { email: formData.email, password: formData.password }
                : { name: formData.name, email: formData.email, password: formData.password, dailyHours: formData.dailyHours };

            const response = await fetch(`${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                if (isLogin) {
                    localStorage.setItem('authToken', data.token);
                    onAuthSuccess(data.token);
                } else {
                    setSuccessMessage('Account created! Please log in.');
                    setTimeout(() => {
                        setIsLogin(true);
                        setSuccessMessage('');
                        setFormData({ ...formData, password: '' });
                    }, 1500);
                }
            } else {
                setError(data.message || data.error || 'Authentication failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };



    const toggleMode = () => {
        setIsLogin(!isLogin);
        setFormData({ name: '', email: '', password: '', dailyHours: 4 });
        setError('');
        setSuccessMessage('');
        setShowPassword(false);
    };

    return (
        <div className="w-full min-h-screen flex font-sans">
            {/* Left side - Hero section */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
                {/* Abstract shapes/decoration */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-500 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 right-20 w-80 h-80 bg-teal-500 rounded-full blur-3xl"></div>
                </div>

                <div className="text-white max-w-lg z-10">
                    <div className="mb-8 w-fit">
                        <img src={adaptaLogo} alt="Adapta AI" className="w-24 h-24 object-contain opacity-90" />
                    </div>
                    <h1 className="text-5xl font-bold mb-6 leading-tight tracking-tight">
                        Unlock Your Potential with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Adapta AI</span>
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed mb-8">
                        Adaptive study plans, intelligent scheduling, and stress-free learning designed just for you.
                    </p>

                    <div className="flex gap-4">
                        <div className="flex -space-x-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs text-white">
                                    Hi
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-sm font-semibold text-white">10k+ Students</span>
                            <span className="text-xs text-slate-400">Joined this month</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Login/Signup form */}
            <div className="flex-1 bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl dark:shadow-none border border-slate-100 dark:border-zinc-800">
                    {/* Logo/Icon (Mobile mostly) */}
                    <div className="text-center mb-8">
                        <div className="lg:hidden inline-flex items-center justify-center mb-4">
                            <img src={adaptaLogo} alt="Adapta AI" className="w-20 h-20 object-contain opacity-90" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {isLogin ? 'Welcome Back' : 'Get Started'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            {isLogin
                                ? 'Continue your learning journey'
                                : 'Create your account to start planning'
                            }
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name field for Signup */}
                        {!isLogin && (
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                {isLogin ? 'Password' : 'Create Password'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 pr-12 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                                    placeholder={isLogin ? "••••••••" : "Min. 8 characters"}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Daily Hours field for Signup */}
                        {!isLogin && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2.5">
                                    Daily Study Hours
                                </label>
                                <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 p-2 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = Math.max(1, formData.dailyHours - 1);
                                            setFormData(prev => ({ ...prev, dailyHours: newVal }));
                                        }}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all font-bold text-xl active:scale-90"
                                    >
                                        −
                                    </button>
                                    <div className="flex-1 text-center py-2">
                                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                                            {formData.dailyHours}
                                        </span>
                                        <span className="text-sm text-slate-400 dark:text-slate-500 font-medium ml-2">hours</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = Math.min(12, formData.dailyHours + 1);
                                            setFormData(prev => ({ ...prev, dailyHours: newVal }));
                                        }}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all font-bold text-xl active:scale-90"
                                    >
                                        +
                                    </button>
                                </div>
                                <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 italic">This helps Adapta balance tasks across all your active goals.</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm">
                                {successMessage}
                            </div>
                        )}

                        {isLogin && (
                            <div className="flex items-center justify-between">
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Remember me</span>
                                </label>
                                <button type="button" className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 font-medium">
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 focus:ring-4 focus:ring-emerald-600/20 active:scale-[0.98]"
                        >
                            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>

                        <div className="text-center pt-2">
                            <span className="text-slate-600 dark:text-slate-400">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                            </span>{' '}
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 font-semibold"
                            >
                                {isLogin ? 'Sign Up' : 'Log In'}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
}
