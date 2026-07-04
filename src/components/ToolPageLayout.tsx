import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, AlertCircle } from 'lucide-react';
import type { PDFTool, ProcessingResult, User, UsageStats } from '../types';
import UploadBox from './UploadBox';
import FilePreview from './FilePreview';
import ProcessingState from './ProcessingState';
import DownloadResult from './DownloadResult';
import { processPdfTool } from '../services/api';
import LucideIcon from './LucideIcon';
import PdfEditorWorkspace from './PdfEditorWorkspace';
import CropPdfWorkspace from './CropPdfWorkspace';
import SignPdfWorkspace from './SignPdfWorkspace';
import AnnotatePdfWorkspace from './AnnotatePdfWorkspace';
import EditPdfWorkspace from './EditPdfWorkspace';
interface ToolPageLayoutProps {
  tool: PDFTool;
  onBackToTools: () => void;
  currentUser: User | null;
  usageStats: UsageStats;
  onTriggerUpgrade: (reason: 'limit' | 'ocr' | 'word' | 'batch' | 'generic') => void;
  onActionProcessed: () => void;
  onNavigate: (page: string) => void;
}

export default function ToolPageLayout({
  tool,
  onBackToTools,
  currentUser,
  usageStats,
  onTriggerUpgrade,
  onActionProcessed,
  onNavigate
}: ToolPageLayoutProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processStatus, setProcessStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [watermarkText, setWatermarkText] = useState('PDFDoer');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [pagesToDelete, setPagesToDelete] = useState('');

  const isPro = currentUser?.tier === 'pro';
  const isFree = currentUser?.tier === 'free';

  const maxFileSizeMB = isPro ? 100 : isFree ? 15 : 5;
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

  const handleFilesSelected = (files: File[]) => {
if (usageStats.actionsCount >= usageStats.actionsLimit) {
  onTriggerUpgrade('limit');
  return;
}
    const allowMultipleFiles = tool.slug === 'merge-pdf' || tool.slug === 'jpg-to-pdf';

    if (files.length > 1 && !isPro && !allowMultipleFiles) {
      onTriggerUpgrade('batch');
      return;
    }

    for (const f of files) {
      if (f.size > maxFileSizeBytes) {
        setErrorMessage(
          `File "${f.name}" exceeds your size limit of ${maxFileSizeMB}MB. (Current plan: ${
            isPro ? 'Pro' : isFree ? 'Free Account' : 'Guest'
          }).`
        );
        setProcessStatus('error');
        return;
      }
    }

    setSelectedFiles(files);
    setProcessStatus('idle');
    setErrorMessage('');
  };

  const handleRemoveFile = (index: number) => {
    const updated = [...selectedFiles];
    updated.splice(index, 1);
    setSelectedFiles(updated);
  };

  const buildToolOptions = () => {
    if (tool.slug === 'add-watermark') {
      return {
        watermarkText: watermarkText.trim() || 'PDFDoer'
      };
    }

    if (tool.slug === 'unlock-pdf') {
      return {
        password: unlockPassword.trim()
      };
    }

    if (tool.slug === 'delete-pages') {
      return {
        pagesToDelete: pagesToDelete.trim()
      };
    }

    return {};
  };

  const handleProcessFile = async (options: Record<string, any> = {}) => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Please select a file to process.');
      setProcessStatus('error');
      return;
    }

    if (tool.slug === 'unlock-pdf' && !unlockPassword.trim()) {
      setErrorMessage('Please enter the current password of this PDF.');
      setProcessStatus('error');
      return;
    }

    if (tool.slug === 'delete-pages' && !pagesToDelete.trim()) {
      setErrorMessage('Please enter the page numbers you want to delete.');
      setProcessStatus('error');
      return;
    }

    if (usageStats.actionsCount >= usageStats.actionsLimit) {
      onTriggerUpgrade('limit');
      return;
    }

    if (tool.slug === 'pdf-to-word' && !isPro) {
      onTriggerUpgrade('word');
      return;
    }

    if (tool.slug === 'ocr-text-recognition' && !isPro) {
      onTriggerUpgrade('ocr');
      return;
    }

    try {
      setProcessStatus('processing');

      const finalOptions = {
        ...options,
        ...buildToolOptions()
      };

      const res = await processPdfTool(tool.slug, selectedFiles, finalOptions);

      onActionProcessed();

      setResult(res);
      setProcessStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while processing your file.');
      setProcessStatus('error');
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setProcessStatus('idle');
    setResult(null);
    setErrorMessage('');
    setUnlockPassword('');
    setPagesToDelete('');
  };

  const specialWorkspaceTools = ['edit-pdf', 'crop-pdf', 'sign-pdf', 'annotate-pdf'];

if (specialWorkspaceTools.includes(tool.slug) && selectedFiles.length > 0) {
  if (usageStats.actionsCount >= usageStats.actionsLimit) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <AlertCircle size={24} />
          </div>

          <h2 className="font-display text-xl font-bold text-slate-900 mb-2">
            Daily Limit Reached
          </h2>

          <p className="text-sm text-slate-600 mb-6">
            You have used all your PDF actions for today. Upgrade to Pro to continue using PDFDoer.
          </p>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => onTriggerUpgrade('limit')}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Upgrade to Pro
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Choose Another File
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tool.slug === 'edit-pdf') {
    return (
      <EditPdfWorkspace
        file={selectedFiles[0]}
        fileName={selectedFiles[0].name}
        onBack={handleReset}
        onActionProcessed={onActionProcessed}
      />
    );
  }

  if (tool.slug === 'crop-pdf') {
    return (
      <CropPdfWorkspace
        file={selectedFiles[0]}
        fileName={selectedFiles[0].name}
        onBack={handleReset}
        onActionProcessed={onActionProcessed}
      />
    );
  }

  if (tool.slug === 'sign-pdf') {
    return (
      <SignPdfWorkspace
        file={selectedFiles[0]}
        fileName={selectedFiles[0].name}
        onBack={handleReset}
        onActionProcessed={onActionProcessed}
      />
    );
  }

  if (tool.slug === 'annotate-pdf') {
    return (
      <AnnotatePdfWorkspace
        file={selectedFiles[0]}
        fileName={selectedFiles[0].name}
        onBack={handleReset}
        onActionProcessed={onActionProcessed}
      />
    );
  }
}

  if (tool.slug === 'crop-pdf' && selectedFiles.length > 0) {
    return (
      <CropPdfWorkspace
        file={selectedFiles[0]}
        fileName={selectedFiles[0].name}
        onBack={handleReset}
        onActionProcessed={onActionProcessed}
      />
    );
  }
if (tool.slug === 'sign-pdf' && selectedFiles.length > 0) {
  return (
    <SignPdfWorkspace
      file={selectedFiles[0]}
      fileName={selectedFiles[0].name}
      onBack={handleReset}
      onActionProcessed={onActionProcessed}
    />
  );
}
if (tool.slug === 'annotate-pdf' && selectedFiles.length > 0) {
  return (
    <AnnotatePdfWorkspace
      file={selectedFiles[0]}
      fileName={selectedFiles[0].name}
      onBack={handleReset}
      onActionProcessed={onActionProcessed}
    />
  );
}
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <button
        onClick={onBackToTools}
        className="group mb-8 flex items-center space-x-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        id="btn-back-to-all-tools"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1 duration-150" />
        <span>Back to All Tools</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <div className="flex items-center space-x-3 mb-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <LucideIcon name={tool.icon} size={20} className="stroke-[2.2]" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 mb-2">
            {tool.title}
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            {tool.description}
          </p>
        </div>
      </div>

      <div className="w-full">
        {processStatus === 'idle' && selectedFiles.length === 0 && (
          <UploadBox
            onFilesSelected={handleFilesSelected}
            acceptedTypes={tool.acceptedTypes}
            isMulti={tool.slug === 'merge-pdf' || tool.slug === 'jpg-to-pdf'}
            toolTitle={tool.title}
          />
        )}

        {processStatus === 'idle' && selectedFiles.length > 0 && (
          <div className="max-w-2xl mx-auto">
            {tool.slug === 'add-watermark' && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Watermark Text
                </label>

                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="Enter your watermark text"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />

                <p className="mt-2 text-xs text-slate-500">
                  This text will be added across your PDF pages.
                </p>
              </div>
            )}

            {tool.slug === 'unlock-pdf' && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Current PDF Password
                </label>

                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Enter the password used to open this PDF"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Enter the correct existing password so PDFDoer can unlock the file.
                </p>
              </div>
            )}

            {tool.slug === 'delete-pages' && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Pages to Delete
                </label>

                <input
                  type="text"
                  value={pagesToDelete}
                  onChange={(e) => setPagesToDelete(e.target.value)}
                  placeholder="Example: 1,3,5-7"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Enter page numbers using commas or ranges. Example: 1,3,5-7
                </p>
              </div>
            )}

            <FilePreview
              files={selectedFiles}
              onRemove={handleRemoveFile}
              onProcess={handleProcessFile}
              toolSlug={tool.slug}
            />
          </div>
        )}

        {processStatus === 'processing' && (
          <ProcessingState toolSlug={tool.slug} />
        )}

        {processStatus === 'success' && result && (
          <DownloadResult
            result={result}
            onRestart={handleReset}
            onBackToTools={onBackToTools}
            toolTitle={tool.title}
          />
        )}

        {processStatus === 'error' && (
          <div className="rounded-lg border border-red-200 bg-white p-8 text-center max-w-2xl mx-auto shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <AlertCircle size={24} />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
              Processing Error occurred
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              {errorMessage}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={onBackToTools}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Go to All Tools
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-16 border-t border-slate-200 pt-12 max-w-4xl mx-auto">
        <h3 className="font-display text-xl font-bold text-slate-800 mb-6 flex items-center space-x-2">
          <HelpCircle size={20} className="text-blue-500" />
          <span>How to use {tool.title} converter</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold mb-3">1</span>
            <h4 className="font-bold text-slate-700 mb-1">Select and upload</h4>
            <p className="text-slate-500 text-xs leading-relaxed">
              Drag your document files into our secure staging dropbox or click Browse to pick from local device files.
            </p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold mb-3">2</span>
            <h4 className="font-bold text-slate-700 mb-1">Configure options</h4>
            <p className="text-slate-500 text-xs leading-relaxed">
              Verify your filenames and use our tool-specific options before converting.
            </p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold mb-3">3</span>
            <h4 className="font-bold text-slate-700 mb-1">Download and clean</h4>
            <p className="text-slate-500 text-xs leading-relaxed">
              Retrieve your polished output instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}