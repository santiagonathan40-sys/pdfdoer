import React, { useState, useRef } from 'react';
import { Upload, Cloud, HardDrive, ShieldAlert, FileText, Sparkles, Database } from 'lucide-react';

interface UploadBoxProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string;
  isMulti?: boolean;
  toolTitle?: string;
}

export default function UploadBox({
  onFilesSelected,
  acceptedTypes = '.pdf, .docx, .xlsx, .jpg, .png',
  isMulti = false,
  toolTitle = 'Document Converter',
}: UploadBoxProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showIntegrationsAlert, setShowIntegrationsAlert] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesList = Array.from(e.dataTransfer.files) as File[];
      if (isMulti) {
        onFilesSelected(filesList);
      } else {
        onFilesSelected([filesList[0]]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesList = Array.from(e.target.files) as File[];
      if (isMulti) {
        onFilesSelected(filesList);
      } else {
        onFilesSelected([filesList[0]]);
      }
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleCloudClick = (platform: string) => {
    setShowIntegrationsAlert(platform);
    setTimeout(() => {
      setShowIntegrationsAlert(null);
    }, 4000);
  };

  return (
    <div className="w-full">
      
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerBrowse}
        className={`relative flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-slate-50 scale-[0.99] shadow-inner'
            : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-slate-50/50 hover:shadow-md'
        }`}
        id="drag-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={isMulti}
          accept={acceptedTypes}
          onChange={handleFileInputChange}
          id="hidden-file-input"
        />

        
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.015] pointer-events-none select-none">
          <Upload size={280} />
        </div>

        
        <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-all duration-300 ${
          isDragActive 
            ? 'scale-110 shadow-md shadow-blue-100' 
            : 'group-hover:scale-105'
        }`}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDragActive ? 'animate-bounce' : ''}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>

        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerBrowse();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold border-none cursor-pointer shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] transition-all mb-2"
          id="btn-browse-files"
        >
          Choose File
        </button>

        <p className="text-sm text-slate-500 max-w-sm mb-4 leading-relaxed">
          or drag and drop here
        </p>

        
        <div className="mt-2 flex items-center space-x-2 text-xs text-slate-400">
          <FileCheckLabel acceptedTypes={acceptedTypes} />
        </div>
      </div>

      
      <div className="mt-8 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Or upload from cloud storage
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleCloudClick('Google Drive')}
            className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
            id="cloud-source-google"
          >
            <Cloud size={14} className="text-blue-500" />
            <span>Google Drive</span>
          </button>
          <button
            type="button"
            onClick={() => handleCloudClick('Dropbox')}
            className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
            id="cloud-source-dropbox"
          >
            <Database size={14} className="text-indigo-500" />
            <span>Dropbox</span>
          </button>
          <button
            type="button"
            onClick={() => handleCloudClick('OneDrive')}
            className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
            id="cloud-source-onedrive"
          >
            <HardDrive size={14} className="text-sky-500" />
            <span>OneDrive</span>
          </button>
        </div>

        
        {showIntegrationsAlert && (
          <div className="mt-4 flex items-center space-x-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 animate-slide-up">
            <ShieldAlert size={14} className="text-amber-600 shrink-0" />
            <span>
              <strong>{showIntegrationsAlert} authentication</strong> requires registering your client API credentials. Connecting live in the backend-ready layout.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function FileCheckLabel({ acceptedTypes }: { acceptedTypes: string }) {
  if (acceptedTypes.includes('pdf') && acceptedTypes.includes('image')) {
    return (
      <span className="flex items-center space-x-1">
        <FileText size={12} />
        <span>Supported: PDF, JPG, PNG, and scanned photos</span>
      </span>
    );
  }
  if (acceptedTypes.includes('word') || acceptedTypes.includes('msword')) {
    return (
      <span className="flex items-center space-x-1">
        <FileText size={12} />
        <span>Supported: Microsoft Word (.docx, .doc)</span>
      </span>
    );
  }
  if (acceptedTypes.includes('pdf')) {
    return (
      <span className="flex items-center space-x-1">
        <Sparkles size={12} />
        <span>Supported format: PDF documents only</span>
      </span>
    );
  }
  return (
    <span className="flex items-center space-x-1">
      <FileText size={12} />
      <span>Supported formats: PDF, DOCX, XLSX, JPG, PNG</span>
    </span>
  );
}
