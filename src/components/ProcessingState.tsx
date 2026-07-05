import React, { useState, useEffect } from 'react';
import { RefreshCw, Shield, Sparkles, Cpu } from 'lucide-react';

interface ProcessingStateProps {
  toolSlug: string;
}

export default function ProcessingState({ toolSlug }: ProcessingStateProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Uploading document to secure portal...');

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 90);

    const t1 = setTimeout(() => {
      setStatusText('Parsing text structures & layout elements...');
    }, 450);

    const t2 = setTimeout(() => {
      setStatusText('Running conversion pipelines & alignment routines...');
    }, 950);

    const t3 = setTimeout(() => {
      setStatusText('Structuring production outputs for high fidelity...');
    }, 1400);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-lg bg-white border border-slate-200 max-w-2xl mx-auto shadow-sm">
      
      
      <div className="relative mb-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
          <RefreshCw size={36} className="text-blue-600 animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-transparent animate-spin duration-1000" />
      </div>

      <h3 className="font-display text-lg font-bold text-slate-800 mb-2">
        Processing File...
      </h3>
      <p className="text-sm font-semibold text-slate-500 mb-6 font-mono transition-all">
        {statusText}
      </p>

      
      <div className="w-full max-w-md bg-slate-100 h-2 rounded-full overflow-hidden mb-8 border border-slate-200">
        <div
          style={{ width: `${progress}%` }}
          className="bg-blue-600 h-full rounded-full transition-all duration-300 shadow-sm"
        />
      </div>

      
      <div className="flex items-center space-x-2 rounded-lg bg-slate-50 border border-slate-200 px-4.5 py-2.5 text-xs text-slate-400 font-medium">
        <Shield size={13} className="text-emerald-500" />
        <span>PDFDOER uses end-to-end sandbox sessions. Your document never hits disk logs.</span>
      </div>
    </div>
  );
}
