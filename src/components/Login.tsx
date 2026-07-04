import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import type { User } from '../types';
import { loginUser } from '../services/authApi';

interface LoginProps {
  onNavigate: (page: string) => void;
  onLogin: (user: User) => void;
}

export default function Login({ onNavigate, onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await loginUser({
        email: email.trim(),
        password,
      });

      if (!result.user) {
        setError('Unable to login. Please try again.');
        return;
      }

      onLogin({
        email: result.user.email,
        tier: result.user.tier,
        createdAt: new Date().toLocaleDateString(),
      });

      onNavigate('home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-6 sm:px-8">
      <div className="w-full max-w-md space-y-8 bg-white border border-slate-200 p-8 sm:p-10 rounded-xl shadow-md animate-fade-in">
        <div className="text-center">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Secure Member Login
          </span>

          <h2 className="mt-4 text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Welcome back
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your PDFDoer workspace and account limits.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit} id="login-form">
          <div className="space-y-4 rounded-md">
            <div>
              <label
                htmlFor="email-address"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>

                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password-field"
                  className="block text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  Password
                </label>

                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline font-medium"
                  onClick={() => alert('Password reset will be added later.')}
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>

                <input
                  id="password-field"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] disabled:bg-slate-300 disabled:cursor-not-allowed"
            id="btn-submit-login"
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Logging in...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5">
                <span>Sign In</span>
                <ArrowRight size={15} />
              </span>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <button
              onClick={() => onNavigate('signup')}
              className="font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Sign up for free
            </button>
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          <span>Protected account access for PDFDoer users</span>
        </div>
      </div>
    </div>
  );
}