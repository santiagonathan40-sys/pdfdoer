import React, { useState } from 'react';
import { Crown, X, CheckCircle, Sparkles } from 'lucide-react';
import AnnotatePdfWorkspace from './AnnotatePdfWorkspace';

interface EditPdfWorkspaceProps {
  file: File;
  fileName: string;
  onBack: () => void;
  onActionProcessed: () => void;
}

export default function EditPdfWorkspace(props: EditPdfWorkspaceProps) {
  const [showProModal, setShowProModal] = useState(false);

  return (
    <div className="relative min-h-screen">
      <AnnotatePdfWorkspace {...props} />

      {/* Premium Edit Toggle */}
     <div className="fixed top-[73px] right-[150px] z-[9998] flex items-center rounded-full border border-slate-300 bg-white p-1 shadow-md">
        <button
          type="button"
          className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold"
        >
          Annotate
        </button>

        <button
          type="button"
          onClick={() => setShowProModal(true)}
          className="px-4 py-1.5 rounded-full text-slate-700 hover:bg-amber-50 hover:text-amber-700 text-xs font-bold flex items-center gap-2"
        >
          Edit
          <Crown size={14} className="text-amber-500 fill-amber-500" />
        </button>
      </div>

      {/* Pro Modal */}
      {showProModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="relative p-6 bg-gradient-to-br from-amber-50 to-white border-b border-amber-100">
              <button
                type="button"
                onClick={() => setShowProModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/70 text-slate-500"
              >
                <X size={18} />
              </button>

              <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <Crown size={22} className="fill-amber-500" />
              </div>

              <h2 className="text-xl font-black text-slate-900 mb-2">
                Edit existing PDF text with PDFDoer Pro
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed">
                Unlock advanced Edit Mode to select existing PDF text, replace wording, and make faster document changes.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle size={17} className="text-emerald-600 mt-0.5" />
                  <p className="text-sm text-slate-700">
                    Select existing PDF text directly from the document.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle size={17} className="text-emerald-600 mt-0.5" />
                  <p className="text-sm text-slate-700">
                    Replace wording without rebuilding the whole file.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Sparkles size={17} className="text-amber-600 mt-0.5" />
                  <p className="text-sm text-slate-700">
                    Save time on resumes, forms, contracts, and business documents.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowProModal(false)}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm"
              >
                Upgrade to Pro
              </button>

              <button
                type="button"
                onClick={() => setShowProModal(false)}
                className="w-full text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Continue with free annotation tools
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}