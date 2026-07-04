import React from 'react';
import { X, Check, Zap } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  onNavigate: (page: string) => void;
  reason?: 'limit' | 'ocr' | 'word' | 'batch' | 'generic';
}

export default function UpgradeModal({
  isOpen,
  onClose,
  onNavigate,
  reason = 'generic',
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const getReasonDetails = () => {
    switch (reason) {
      case 'limit':
        return {
          badge: 'ACTION LIMIT REACHED',
          title: "You've processed all free documents",
          desc: "You've reached your free action limit. View pricing to upgrade your PDFDoer account and continue processing files.",
        };
      case 'ocr':
        return {
          badge: 'PREMIUM TOOL',
          title: 'Unlock OCR Text Recognition',
          desc: 'OCR Text Recognition is a Pro feature that scans documents and extracts editable text from images and PDFs.',
        };
      case 'word':
        return {
          badge: 'PREMIUM CONVERTER',
          title: 'Unlock PDF to Word Converter',
          desc: 'PDF to Word conversion is a Pro feature that helps turn PDF pages into editable DOCX documents.',
        };
      case 'batch':
        return {
          badge: 'BATCH PROCESSING',
          title: 'Process multiple files together',
          desc: 'Batch processing is available on Pro, so you can upload and process multiple files faster.',
        };
      default:
        return {
          badge: 'GO PRO',
          title: 'Upgrade to PDFDoer Pro',
          desc: 'Get more PDF actions, larger file limits, OCR support, PDF to Word conversion, and premium PDF tools.',
        };
    }
  };

  const details = getReasonDetails();

  const handleGoToPricing = () => {
    onClose();
    onNavigate('pricing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="absolute left-0 right-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          title="Close dialog"
          type="button"
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex w-fit items-center space-x-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
          <Zap size={11} className="fill-current text-blue-600" />
          <span>{details.badge}</span>
        </div>

        <h3 className="font-display text-2xl font-extrabold leading-snug tracking-tight text-slate-900">
          {details.title}
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {details.desc}
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            Included with Pro
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              'More document actions',
              'Larger file size limit',
              'OCR text extraction',
              'PDF to editable Word',
              'Batch file operations',
              'Premium PDF tools',
              'PDF workflow features',
              'Priority improvements',
            ].map((benefit) => (
              <div
                key={benefit}
                className="flex items-start space-x-2 text-xs font-medium text-slate-600"
              >
                <Check size={14} className="mt-0.5 shrink-0 text-blue-500" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-slate-900">
              PDFDoer Pro starts at $2/month
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Choose monthly or yearly Pro access on the pricing page.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
              type="button"
            >
              Maybe Later
            </button>

            <button
              onClick={handleGoToPricing}
              className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-center text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
              id="btn-modal-upgrade-confirm"
              type="button"
            >
              View Pricing
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="text-[10px] font-medium text-slate-400">
            Secure payment through PayPal
          </span>
        </div>
      </div>
    </div>
  );
}