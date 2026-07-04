import React from 'react';
import { CheckCircle2, Download, RefreshCw, FileText, Share2, Sparkles, ArrowLeft } from 'lucide-react';
import type { ProcessingResult } from '../types';

interface DownloadResultProps {
  result: ProcessingResult;
  onRestart: () => void;
  onBackToTools: () => void;
  toolTitle: string;
}

export default function DownloadResult({
  result,
  onRestart,
  onBackToTools,
  toolTitle,
}: DownloadResultProps) {
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-md">
      
      
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shadow-md shadow-emerald-100/50">
        <CheckCircle2 size={32} className="stroke-[2.5]" />
      </div>

      <h3 className="font-display text-2xl font-bold text-slate-900 mb-1.5">
        Your document is ready!
      </h3>
      <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
        Your file has been processed successfully by the <strong>{toolTitle}</strong> converter engine. Download it to your device below.
      </p>

      
      <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50/30 p-5 flex items-center justify-between text-left">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-200 shrink-0">
            <FileText size={28} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-sm">
               {result.fileName}
            </p>
            <p className="text-xs text-slate-400 font-medium">
              File size: {result.fileSize} &bull; Ready at {result.timestamp}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Completed
        </span>
      </div>

      
      <div className="flex flex-col sm:flex-row items-center gap-3.5">
        <button
          type="button"
          onClick={handleDownload}
          className="w-full flex items-center justify-center space-x-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-3.5 font-semibold shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] transition-all cursor-pointer"
          id="btn-download-result"
        >
          <Download size={18} />
          <span>Download Document</span>
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3.5 font-semibold transition-all cursor-pointer shrink-0"
          id="btn-process-another"
        >
          <RefreshCw size={15} />
          <span>Convert Another</span>
        </button>
      </div>

      
      <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <button
          onClick={onBackToTools}
          className="flex items-center space-x-1.5 font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to All Tools</span>
        </button>

        <div className="flex items-center space-x-1 font-mono text-[10px] text-slate-400">
          <Sparkles size={11} className="text-amber-500" />
          <span>FastAPI Integration-Ready Payload</span>
        </div>
      </div>
    </div>
  );
}
