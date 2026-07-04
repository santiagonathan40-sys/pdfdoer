import React from 'react';
import {
  User as UserIcon,
  Zap,
  Clock,
  FileText,
  ShieldAlert,
  LogOut,
  FileCheck,
  CreditCard,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import type { User, UsageStats } from '../types';
import AdminPanel from './AdminPanel';

interface DashboardProps {
  currentUser: User | null;
  usageStats: UsageStats;
  onNavigate: (page: string, filter?: string, slug?: string) => void;
  onLogout: () => void;
  onUpgradeTier?: (tier: 'free' | 'pro') => void;
}

export default function Dashboard({
  currentUser,
  usageStats,
  onNavigate,
  onLogout,
}: DashboardProps) {
  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 border border-blue-200">
          <UserIcon size={30} />
        </div>

        <h2 className="text-2xl font-display font-extrabold text-slate-800 mb-2">
          Member Workspace Restricted
        </h2>

        <p className="text-sm text-slate-500 max-w-sm mb-6">
          Please sign in or create an account to view your secure file limits and usage history.
        </p>

        <div className="flex space-x-3">
          <button
            onClick={() => onNavigate('login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all shadow-md shadow-blue-100"
          >
            Sign In
          </button>

          <button
            onClick={() => onNavigate('signup')}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  const usedPercentage = Math.min(
    100,
    Math.round((usageStats.actionsCount / usageStats.actionsLimit) * 100)
  );

  const isCloseToLimit = usedPercentage >= 80;

  const processHistory = [
    {
      name: 'tax-return-draft.pdf',
      tool: 'Compress PDF',
      date: 'Today, 10:14 AM',
      size: '1.2 MB',
      action: 'Download',
    },
    {
      name: 'employment-contract.docx',
      tool: 'Word to PDF',
      date: 'Yesterday, 4:20 PM',
      size: '3.4 MB',
      action: 'Download',
    },
    {
      name: 'invoice-30042.jpg',
      tool: 'JPG to PDF',
      date: 'Jun 28, 2026',
      size: '840 KB',
      action: 'Download',
    },
  ];

  const handleGoToPricing = () => {
    onNavigate('pricing');
  };

  return (
    <div className="min-h-screen py-12 px-6 sm:px-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-200 pb-8">
        <div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Workspace Dashboard
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Hello,</span>
            <span className="text-blue-600">{currentUser.email.split('@')[0]}</span>
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage your personal processing limits, usage statistics, and subscription access.
          </p>
        </div>

        <div className="flex items-center space-x-3.5">
          <button
            onClick={() => onNavigate('all-tools')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] transition-all cursor-pointer"
          >
            New Action
          </button>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 border border-slate-200 bg-white hover:bg-slate-50 hover:text-red-600 text-slate-600 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <AdminPanel currentUser={currentUser} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 mt-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display font-extrabold text-slate-800 text-lg flex items-center space-x-2">
                  <TrendingUp size={18} className="text-blue-600" />
                  <span>Daily Document Actions</span>
                </h3>

                <p className="text-xs text-slate-400 mt-0.5">
                  Free accounts have daily usage limits. Pro accounts have expanded access.
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-extrabold text-slate-900">
                  {usageStats.actionsCount}
                </span>
                <span className="text-sm text-slate-400 font-bold">
                  {' '} / {usageStats.actionsLimit}{' '}
                </span>
                <span className="text-xs text-slate-500 font-medium block">
                  actions used
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200 mb-4">
              <div
                style={{ width: `${usedPercentage}%` }}
                className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                  isCloseToLimit ? 'bg-orange-500' : 'bg-blue-600'
                }`}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <ShieldAlert
                  size={14}
                  className={`shrink-0 mt-0.5 ${
                    isCloseToLimit ? 'text-orange-500' : 'text-slate-400'
                  }`}
                />

                <span>
                  {currentUser.tier === 'pro'
                    ? 'Pro account limits active. You have access to premium PDFDoer features.'
                    : 'Free accounts have 10 actions per day. Upgrade to Pro for more access.'}
                </span>
              </div>

              {currentUser.tier !== 'pro' && (
                <button
                  onClick={handleGoToPricing}
                  className="text-blue-600 font-semibold hover:underline flex items-center space-x-0.5 shrink-0"
                >
                  <span>View Pricing</span>
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h3 className="font-display font-extrabold text-slate-800 text-lg flex items-center space-x-2">
                <Clock size={18} className="text-slate-500" />
                <span>Workspace Process Files ({processHistory.length})</span>
              </h3>

              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-md">
                Recent Activity
              </span>
            </div>

            <div className="space-y-4">
              {processHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs transition-all gap-4"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-blue-600 shrink-0 shadow-sm">
                      <FileText size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-slate-700 truncate">{item.name}</p>
                      <p className="text-slate-400 mt-0.5 font-medium">
                        {item.tool} &bull; {item.size}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <span className="text-slate-400 text-[11px] font-medium">
                      {item.date}
                    </span>

                    <button
                      onClick={() => alert(`Download preview opened for ${item.name}`)}
                      className="bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-400 px-3 py-1.5 rounded-md font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                    >
                      <FileCheck size={12} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
            {currentUser.tier === 'pro' && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[8px] font-extrabold tracking-widest uppercase px-3.5 py-1 rounded-bl-lg">
                PRO ACTIVE
              </div>
            )}

            <h3 className="font-display font-extrabold text-slate-800 text-sm mb-4">
              Subscription Plan
            </h3>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                Active Level
              </span>

              <span className="text-xl font-black text-slate-800 mt-1 block uppercase tracking-wide">
                {currentUser.tier === 'pro' ? 'PRO SUBSCRIPTION' : 'FREE ACCOUNT'}
              </span>

              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {currentUser.tier === 'pro'
                  ? 'You have Pro access to PDFDoer tools and expanded usage limits.'
                  : 'You have basic access. You can process up to 10 files per day.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Registered Email</span>
                <span className="text-slate-700 font-bold truncate max-w-[180px]">
                  {currentUser.email}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="text-slate-400 font-semibold">Account Status</span>
                <span className="text-emerald-600 font-bold flex items-center space-x-1">
                  <span className="stat-dot" />
                  <span>Verified</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="text-slate-400 font-semibold">Member Since</span>
                <span className="text-slate-700 font-bold">
                  {currentUser.createdAt || 'Active'}
                </span>
              </div>
            </div>

            {currentUser.tier !== 'pro' ? (
              <button
                onClick={handleGoToPricing}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg text-xs font-extrabold shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Zap size={13} className="fill-current text-white" />
                <span>Upgrade to Pro</span>
              </button>
            ) : (
              <div className="w-full mt-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3.5 text-center text-xs font-bold text-blue-700">
                Pro access active
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-display font-extrabold text-slate-800 text-sm mb-3">
              Billing & Payment
            </h3>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Manage your Pro subscription through PayPal.
            </p>

            <button
              onClick={handleGoToPricing}
              className="w-full border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 bg-white py-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <CreditCard size={14} />
              <span>View Pricing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}