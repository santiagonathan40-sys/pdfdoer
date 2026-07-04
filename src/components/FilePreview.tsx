import React, { useState } from 'react';
import { X, FileText, Image as ImageIcon, FileSpreadsheet, Play, Lock, Settings, Sliders, RefreshCw } from 'lucide-react';

interface FilePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  onProcess: (options?: Record<string, any>) => void;
  toolSlug: string;
}

export default function FilePreview({ files, onRemove, onProcess, toolSlug }: FilePreviewProps) {
  const [compressLevel, setCompressLevel] = useState('recommended');
  const [protectPassword, setProtectPassword] = useState('');
  const [rotateAngle, setRotateAngle] = useState('90');
  const [targetPages, setTargetPages] = useState('all');
  const [ocrLanguage, setOcrLanguage] = useState('eng');

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.includes('pdf')) return <FileText className="text-red-500" size={32} />;
    if (type.includes('image')) return <ImageIcon className="text-blue-500" size={32} />;
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet className="text-emerald-500" size={32} />;
    return <FileText className="text-slate-500" size={32} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleProcessClick = () => {
    const options: Record<string, any> = {};
    if (toolSlug === 'compress-pdf') options.compressLevel = compressLevel;
    if (toolSlug === 'password-protect') options.password = protectPassword;
    if (toolSlug === 'rotate-pdf') options.angle = rotateAngle;
    if (toolSlug === 'delete-pages') options.pagesRange = targetPages;
    if (toolSlug === 'ocr-text-recognition') options.language = ocrLanguage;
    onProcess(options);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-display text-base font-bold text-slate-800">
          Selected Files ({files.length})
        </h4>
        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
          Active Tool: <span className="font-semibold text-blue-600">{toolSlug}</span>
        </span>
      </div>

      
      <div className="space-y-3.5 mb-8">
        {files.map((file, idx) => (
          <div
            key={`${file.name}-${idx}`}
            className="flex items-center justify-between rounded-lg bg-white p-4 border border-slate-200 shadow-sm transition-all hover:border-blue-400"
          >
            <div className="flex items-center space-x-4 min-w-0">
              <div className="p-2 bg-slate-50 rounded-lg">
                {getFileIcon(file)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {file.name}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  {formatSize(file.size)} &bull; {file.type || 'Unknown Type'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Remove document"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      
      {['compress-pdf', 'password-protect', 'rotate-pdf', 'ocr-text-recognition'].includes(toolSlug) && (
        <div className="border-t border-slate-200 pt-6 mb-8">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            <Sliders size={14} className="text-slate-400" />
            <span>Process Settings</span>
          </div>

          {toolSlug === 'compress-pdf' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'basic', label: 'Basic compression', desc: 'Slight savings, high quality' },
                { id: 'recommended', label: 'Recommended', desc: 'Good savings, great quality' },
                { id: 'extreme', label: 'Extreme compression', desc: 'Max savings, lower resolution' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setCompressLevel(lvl.id)}
                  className={`flex flex-col text-left p-4 rounded-lg border transition-all ${
                    compressLevel === lvl.id
                      ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={`text-xs font-bold ${compressLevel === lvl.id ? 'text-blue-600' : 'text-slate-800'}`}>
                    {lvl.label}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">{lvl.desc}</span>
                </button>
              ))}
            </div>
          )}

          {toolSlug === 'password-protect' && (
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Choose a password to secure document
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={protectPassword}
                  onChange={(e) => setProtectPassword(e.target.value)}
                  placeholder="At least 6 characters recommended"
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 focus:border-blue-500 focus:outline-none shadow-inner"
                  id="field-protect-password"
                />
              </div>
            </div>
          )}

          {toolSlug === 'rotate-pdf' && (
            <div className="flex items-center space-x-3">
              {[
                { value: '90', label: '90° Clockwise' },
                { value: '180', label: '180° Flip' },
                { value: '270', label: '90° Counter-Clockwise' },
              ].map((angle) => (
                <button
                  key={angle.value}
                  type="button"
                  onClick={() => setRotateAngle(angle.value)}
                  className={`rounded-lg border px-4 py-2.5 text-xs font-semibold transition-all ${
                    rotateAngle === angle.value
                      ? 'border-blue-600 bg-blue-50/40 text-blue-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {angle.label}
                </button>
              ))}
            </div>
          )}

          {toolSlug === 'ocr-text-recognition' && (
            <div className="max-w-xs">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Primary Text Language
              </label>
              <select
                value={ocrLanguage}
                onChange={(e) => setOcrLanguage(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                id="select-ocr-lang"
              >
                <option value="eng">English (US/UK)</option>
                <option value="spa">Spanish (Español)</option>
                <option value="fra">French (Français)</option>
                <option value="deu">German (Deutsch)</option>
              </select>
            </div>
          )}
        </div>
      )}

      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <p className="text-xs text-slate-400">
          * Secured under military-grade privacy settings. Your data is deleted automatically in 1 hr.
        </p>

        <button
          type="button"
          onClick={handleProcessClick}
          disabled={toolSlug === 'password-protect' && protectPassword.length === 0}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3.5 text-sm font-bold shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] transition-all cursor-pointer"
          id="btn-process-file"
        >
          <Play size={15} className="fill-current" />
          <span>Process Document</span>
        </button>
      </div>
    </div>
  );
}
