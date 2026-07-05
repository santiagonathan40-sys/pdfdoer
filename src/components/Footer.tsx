import React from 'react';
import { Shield, Zap, Clock, Heart } from 'lucide-react';
import pdfDoerLogoDark from '../assets/images/pdf_doer_logo_dark.svg';

interface FooterProps {
  onNavigate: (page: string, categoryFilter?: string, toolSlug?: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    convert: [
      { label: 'PDF to Word', slug: 'pdf-to-word' },
      { label: 'Word to PDF', slug: 'word-to-pdf' },
      { label: 'PDF to Excel', slug: 'pdf-to-excel' },
      { label: 'PDF to JPG', slug: 'pdf-to-jpg' },
      { label: 'JPG to PDF', slug: 'jpg-to-pdf' },
    ],
    organize: [
      { label: 'Compress PDF', slug: 'compress-pdf' },
      { label: 'Merge PDF', slug: 'merge-pdf' },
      { label: 'Split PDF', slug: 'split-pdf' },
      { label: 'Rotate PDF', slug: 'rotate-pdf' },
      { label: 'Delete Pages', slug: 'delete-pages' },
    ],
    editSec: [
      { label: 'Edit PDF', slug: 'edit-pdf' },
      { label: 'Sign PDF', slug: 'sign-pdf' },
      { label: 'Add Watermark', slug: 'add-watermark' },
      { label: 'Password Protect', slug: 'password-protect' },
      { label: 'OCR Text Recognition', slug: 'ocr-text-recognition' },
    ],
    company: [
      { label: 'About Us', href: '#' },
      { label: 'Security Standards', href: '#' },
      { label: 'Developers & API', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ]
  };

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      
      
      <div className="border-b border-slate-800 bg-slate-950/40">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center space-x-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Military-Grade Encryption</h4>
                <p className="text-xs text-slate-500">Your documents are safe with AES-256 keys</p>
              </div>
            </div>
            <div className="flex items-center space-x-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <Zap size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Ultra-Fast Conversion</h4>
                <p className="text-xs text-slate-500">Optimized servers deliver results in seconds</p>
              </div>
            </div>
            <div className="flex items-center space-x-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Clock size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Automatic Cleanup</h4>
                <p className="text-xs text-slate-500">Files are permanently auto-deleted</p>
              </div>
            </div>
            <div className="flex items-center space-x-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Heart size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Completely Free</h4>
                <p className="text-xs text-slate-500">Enjoy our core features with no registration required</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          
          
          <div className="col-span-2 space-y-6">
            <div className="flex items-center">
              <img 
                src={pdfDoerLogoDark} 
                alt="PDF Doer" 
                className="h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Every document utility you need under one roof. Easily convert, split, merge, lock, unlock, and edit PDF layouts on any operating system.
            </p>
          </div>

          
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4">Convert</h3>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.convert.map((link) => (
                <li key={link.slug}>
                  <button
                    onClick={() => onNavigate('tool', undefined, link.slug)}
                    className="hover:text-white transition-colors text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4">Organize</h3>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.organize.map((link) => (
                <li key={link.slug}>
                  <button
                    onClick={() => onNavigate('tool', undefined, link.slug)}
                    className="hover:text-white transition-colors text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4">Edit & Protect</h3>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.editSec.map((link) => (
                <li key={link.slug}>
                  <button
                    onClick={() => onNavigate('tool', undefined, link.slug)}
                    className="hover:text-white transition-colors text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

        </div>

        
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {currentYear} PDF Doer. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
