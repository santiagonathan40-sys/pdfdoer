import React, { useState } from 'react';
import { X, UserPlus, LogIn } from 'lucide-react';
import { loginUser, registerUser, AuthUser } from '../services/authApi';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = isRegister
        ? await registerUser({ name, email, password })
        : await loginUser({ email, password });

      if (result.user) {
        onAuthSuccess(result.user);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="relative p-6 border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white text-slate-500"
          >
            <X size={18} />
          </button>

          <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            {isRegister ? <UserPlus size={22} /> : <LogIn size={22} />}
          </div>

          <h2 className="text-xl font-black text-slate-900">
            {isRegister ? 'Create your PDFDoer account' : 'Login to PDFDoer'}
          </h2>

          <p className="text-sm text-slate-600 mt-2">
            {isRegister
              ? 'Start using PDF tools and track your free actions.'
              : 'Access your free or Pro PDFDoer account.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 text-sm"
          >
            {loading
              ? 'Please wait...'
              : isRegister
                ? 'Create Account'
                : 'Login'}
          </button>

          <button
            type="button"
            onClick={() => {
              setError('');
              setMode(isRegister ? 'login' : 'register');
            }}
            className="w-full text-sm font-bold text-slate-600 hover:text-blue-600"
          >
            {isRegister
              ? 'Already have an account? Login'
              : 'No account yet? Create one'}
          </button>
        </form>
      </div>
    </div>
  );
}