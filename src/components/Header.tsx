import React, { useState } from 'react';
import { Menu, X, ArrowRight, PhoneCall, HelpCircle, User as UserIcon, Zap } from 'lucide-react';
import type { User } from '../types';
import pdfDoerLogo from '../assets/images/pdf_doer_logo.svg';

interface HeaderProps {
  onNavigate: (page: string, categoryFilter?: string, toolSlug?: string) => void;
  activePage: string;
  currentUser: User | null;
  onLogout: () => void;
}

export default function Header({ onNavigate, activePage, currentUser, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const navItems = [
    { label: 'All Tools', action: () => onNavigate('all-tools') },
    { label: 'Pricing', action: () => onNavigate('pricing') },
    { label: 'Convert', action: () => onNavigate('all-tools', 'convert') },
    { label: 'Edit', action: () => onNavigate('all-tools', 'edit') },
    { label: 'Compress', action: () => onNavigate('tool', undefined, 'compress-pdf') },
    { label: 'Merge', action: () => onNavigate('tool', undefined, 'merge-pdf') },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-slate-200 bg-white shadow-sm flex items-center shrink-0">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 sm:px-8">
        
        
        <div 
          onClick={() => onNavigate('home')} 
          className="flex cursor-pointer items-center group"
          id="header-logo-container"
        >
          <img 
            src={pdfDoerLogo} 
            alt="PDF Doer Logo" 
            className="h-9 w-auto object-contain transition-transform group-hover:scale-[1.03]"
            referrerPolicy="no-referrer"
          />
        </div>

        
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => {
            const isActive = (activePage === 'all-tools' && item.label === 'All Tools') ||
                             (activePage === 'pricing' && item.label === 'Pricing');
            return (
              <button
                key={item.label}
                onClick={item.action}
                className={`text-sm font-medium transition-all duration-150 hover:text-blue-600 cursor-pointer ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-slate-500'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        
        <div className="hidden md:flex items-center space-x-3.5">
          <button 
            onClick={() => setShowContactModal(true)}
            className="text-slate-500 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer transition-all"
            id="btn-contact-support"
          >
            <span>Support</span>
          </button>

          {currentUser ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 border rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  currentUser.tier === 'pro'
                    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                id="header-btn-dashboard"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {currentUser.tier === 'pro' ? '👑' : 'U'}
                </span>
                <span className="truncate max-w-[100px]">{currentUser.email.split('@')[0]}</span>
              </button>
              <button
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-red-600 font-semibold cursor-pointer transition-colors"
                id="header-btn-signout"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('login')}
                className="text-sm font-semibold text-slate-500 hover:text-blue-600 px-3 py-2 cursor-pointer"
                id="header-btn-login"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('signup')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] transition-all flex items-center space-x-1"
                id="header-btn-signup"
              >
                <span>Sign Up</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        
        <div className="md:hidden flex items-center space-x-2">
          <button
            onClick={() => setShowContactModal(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            title="Contact Support"
          >
            <PhoneCall size={18} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 border-b border-slate-200 bg-white px-4 py-4 space-y-3 shadow-inner z-50">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  item.action();
                  setMobileMenuOpen(false);
                }}
                className="block w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
              >
                {item.label}
              </button>
            ))}
          </div>
          <hr className="border-slate-100" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    onNavigate('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center space-x-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50"
                >
                  <span>My Workspace</span>
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 text-center"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onNavigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center space-x-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50"
                >
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 text-center"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      )}

      
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mb-4 border border-blue-100">
              <HelpCircle size={24} />
            </div>

            <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
              Need assistance?
            </h3>
            <p className="text-slate-600 text-xs mb-6 leading-relaxed">
              We're building our customer support system. In the meantime, you can get in touch with our team directly via email or our hotline:
            </p>

            <div className="space-y-3.5 mb-6">
              <div className="flex items-center space-x-3 rounded-lg bg-slate-50 p-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-16">Email</span>
                <span className="text-xs font-bold text-slate-800">support@pdfdoer.com</span>
              </div>
              <div className="flex items-center space-x-3 rounded-lg bg-slate-50 p-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-16">Phone</span>
                <span className="text-xs font-bold text-slate-800">+1 (800) 555-DOER</span>
              </div>
              <div className="flex items-center space-x-3 rounded-lg bg-slate-50 p-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-16">Hours</span>
                <span className="text-xs font-semibold text-slate-600">Mon - Fri, 9:00 AM - 6:00 PM EST</span>
              </div>
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              className="w-full rounded-lg bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

