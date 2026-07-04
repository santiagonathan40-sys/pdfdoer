import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight, User as UserIcon, Check } from 'lucide-react';
import type { User } from '../types';
import { registerUser } from '../services/authApi';

interface SignupProps {
  onNavigate: (page: string) => void;
  onLogin: (user: User) => void;
}

export default function Signup({ onNavigate, onLogin }: SignupProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms and Privacy Policy');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await registerUser({
        name: fullName.trim(),
        email: email.trim(),
        password,
      });

      if (!result.user) {
        setError('Unable to create account. Please try again.');
        return;
      }

      onLogin({
        email: result.user.email,
        tier: result.user.tier,
        createdAt: new Date().toLocaleDateString(),
      });

      onNavigate('home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-6 sm:px-8">
      <div className="w-full max-w-lg space-y-8 bg-white border border-slate-200 p-8 sm:p-10 rounded-xl shadow-md animate-fade-in">
        <div className="text-center">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Create Free Account
          </span>

          <h2 className="mt-4 text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Start Processing PDFs
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create your PDFDoer account, track your actions, and upgrade when you need more power.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignupSubmit} id="signup-form">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="full-name"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
              >
                Full Name
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon size={16} />
                </div>

                <input
                  id="full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                  placeholder="Alex Smith"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>

                <input
                  id="signup-email"
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
              <label
                htmlFor="signup-password"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
              >
                Choose Password
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>

                <input
                  id="signup-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                  placeholder="Must be 6+ characters"
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <Check size={13} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Free Account
                  </h3>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Your account starts on the Free plan. Pro upgrades will be handled securely through payment checkout.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start pt-1">
              <div className="flex items-center h-5">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="ml-3 text-xs">
                <label htmlFor="agree-terms" className="font-medium text-slate-500 cursor-pointer">
                  I agree to PDFDoer&apos;s{' '}
                  <button
                    type="button"
                    onClick={() => alert('Terms page will be connected before launch.')}
                    className="text-blue-600 hover:underline"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => alert('Privacy policy page will be connected before launch.')}
                    className="text-blue-600 hover:underline"
                  >
                    Privacy Policy
                  </button>
                  .
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] disabled:bg-slate-300 disabled:cursor-not-allowed"
            id="btn-submit-signup"
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Creating account...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5">
                <span>Create Free Account</span>
                <ArrowRight size={15} />
              </span>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Log in instead
            </button>
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          <span>Secure account registration for PDFDoer users</span>
        </div>
      </div>
    </div>
  );
}