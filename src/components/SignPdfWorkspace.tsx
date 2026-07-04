import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  PenTool,
  Download,
  Loader2,
  Move,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { processPdfTool } from '../services/api';
import type { ProcessingResult } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface SignPdfWorkspaceProps {
  file: File;
  fileName: string;
  onBack: () => void;
  onActionProcessed: () => void;
}

interface SignaturePosition {
  x: number;
  y: number;
}

type SignatureStyle =
  | 'sevenDay'
  | 'autoSignature'
  | 'autography'
  | 'brittany'
  | 'darlington'
  | 'signerica'
  | 'classic'
  | 'elegant'
  | 'bold'
  | 'simple'
  | 'formal';

const BACKEND_URL = 'http://localhost:5000';

const fontFaceCss = `
  @font-face {
    font-family: 'SevenDaySignature';
    src: url('${BACKEND_URL}/fonts/SevenDaySignature-RpKO3.otf') format('opentype');
    font-display: swap;
  }

  @font-face {
    font-family: 'AAutoSignature';
    src: url('${BACKEND_URL}/fonts/AAutoSignature-1GD9j.ttf') format('truetype');
    font-display: swap;
  }

  @font-face {
    font-family: 'Autography';
    src: url('${BACKEND_URL}/fonts/Autography-DOLnW.otf') format('opentype');
    font-display: swap;
  }

  @font-face {
    font-family: 'BrittanySignature';
    src: url('${BACKEND_URL}/fonts/BrittanySignature-LjyZ.otf') format('opentype');
    font-display: swap;
  }

  @font-face {
    font-family: 'DarlingtonDemo';
    src: url('${BACKEND_URL}/fonts/DarlingtonDemo-z8xjG.ttf') format('truetype');
    font-display: swap;
  }

  @font-face {
    font-family: 'SignericaMedium';
    src: url('${BACKEND_URL}/fonts/SignericaMedium-RXOo.ttf') format('truetype');
    font-display: swap;
  }
`;

const signatureStyles: {
  id: SignatureStyle;
  label: string;
  fontFamily: string;
  fontStyle?: string;
  fontWeight?: string;
  isPremium?: boolean;
}[] = [
  {
    id: 'sevenDay',
    label: 'Seven Day Signature',
    fontFamily: 'SevenDaySignature, cursive',
    fontStyle: 'normal',
    fontWeight: '400',
    isPremium: true
  },
  {
    id: 'autoSignature',
    label: 'Auto Signature',
    fontFamily: 'AAutoSignature, cursive',
    fontStyle: 'normal',
    fontWeight: '400',
    isPremium: true
  },
  {
    id: 'autography',
    label: 'Autography',
    fontFamily: 'Autography, cursive',
    fontStyle: 'normal',
    fontWeight: '400',
    isPremium: true
  },
  {
    id: 'brittany',
    label: 'Brittany Signature',
    fontFamily: 'BrittanySignature, cursive',
    fontStyle: 'normal',
    fontWeight: '400',
    isPremium: true
  },
  {
    id: 'darlington',
    label: 'Darlington',
    fontFamily: 'DarlingtonDemo, cursive',
    fontStyle: 'normal',
    fontWeight: '400',
    isPremium: true
  },
  {
    id: 'signerica',
    label: 'Signerica',
    fontFamily: 'SignericaMedium, cursive',
    fontStyle: 'normal',
    fontWeight: '400',
    isPremium: true
  },
  {
    id: 'classic',
    label: 'Classic',
    fontFamily: 'Georgia, Times New Roman, serif',
    fontStyle: 'italic',
    fontWeight: '400'
  },
  {
    id: 'elegant',
    label: 'Elegant',
    fontFamily: 'Georgia, Times New Roman, serif',
    fontStyle: 'italic',
    fontWeight: '700'
  },
  {
    id: 'bold',
    label: 'Bold',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontStyle: 'normal',
    fontWeight: '700'
  },
  {
    id: 'simple',
    label: 'Simple',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontStyle: 'normal',
    fontWeight: '400'
  },
  {
    id: 'formal',
    label: 'Formal',
    fontFamily: 'Courier New, Courier, monospace',
    fontStyle: 'italic',
    fontWeight: '400'
  }
];

export default function SignPdfWorkspace({
  file,
  fileName,
  onBack,
  onActionProcessed
}: SignPdfWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 560, height: 740 });

  const [signatureText, setSignatureText] = useState('Your Signature');
  const [signatureStyle, setSignatureStyle] = useState<SignatureStyle>('sevenDay');
  const [signaturePosition, setSignaturePosition] = useState<SignaturePosition>({
    x: 50,
    y: 78
  });
  const [fontSize, setFontSize] = useState(46);
  const [signatureColor, setSignatureColor] = useState('#0f172a');

  const [isDragging, setIsDragging] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const activeStyle = signatureStyles.find((style) => style.id === signatureStyle) || signatureStyles[0];

  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };

  useEffect(() => {
    const existingStyle = document.getElementById('pdfdoer-signature-fonts');

    if (!existingStyle) {
      const styleTag = document.createElement('style');
      styleTag.id = 'pdfdoer-signature-fonts';
      styleTag.innerHTML = fontFaceCss;
      document.head.appendChild(styleTag);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      try {
        setPreviewStatus('loading');

        const buffer = await file.arrayBuffer();
        const loadedPdf = await pdfjsLib.getDocument({ data: buffer }).promise;

        if (cancelled) return;

        setPdfDoc(loadedPdf);
        setPageCount(loadedPdf.numPages || 1);
        setCurrentPage(1);
        setPreviewStatus('ready');
      } catch (error) {
        console.error(error);
        setPreviewStatus('error');
        setErrorMessage('Could not load the PDF preview.');
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(currentPage);

        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        setCanvasSize({
          width: viewport.width,
          height: viewport.height
        });

        context.clearRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context,
          viewport
        }).promise;
      } catch (error) {
        console.error(error);
        setPreviewStatus('error');
        setErrorMessage('Could not render this PDF page.');
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage]);

  const getMousePercent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = pageRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleSignatureMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const mouse = getMousePercent(e);

    setSignaturePosition({
      x: clamp(mouse.x, 0, 100),
      y: clamp(mouse.y, 0, 100)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const goPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goNextPage = () => {
    setCurrentPage((page) => Math.min(pageCount, page + 1));
  };

  const handleSignPdf = async () => {
    if (!signatureText.trim()) {
      setStatus('error');
      setErrorMessage('Please enter your signature text.');
      return;
    }

    try {
      setStatus('processing');
      setErrorMessage('');

      const res = await processPdfTool('sign-pdf', [file], {
        signatureText: signatureText.trim(),
        signatureStyle,
        currentPage,
        x: signaturePosition.x,
        y: signaturePosition.y,
        fontSize,
        color: signatureColor
      });

      setResult(res);
      setStatus('success');
      onActionProcessed();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to sign this PDF.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <PenTool size={16} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800 truncate max-w-[360px]">
                Sign PDF
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-[360px]">
                {fileName}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSignPdf}
          disabled={status === 'processing' || previewStatus !== 'ready'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm"
        >
          {status === 'processing' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Signing...
            </>
          ) : (
            <>
              <Download size={14} />
              Sign PDF
            </>
          )}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-8 flex justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
              <button
                onClick={goPreviousPage}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-xs font-bold text-slate-600">
                Page {currentPage} of {pageCount}
              </span>

              <button
                onClick={goNextPage}
                disabled={currentPage >= pageCount}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div
              ref={pageRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="relative bg-white shadow-2xl border border-slate-300 select-none overflow-hidden"
              style={{
                width: `${canvasSize.width}px`,
                height: `${canvasSize.height}px`
              }}
            >
              {previewStatus === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Loading PDF preview...
                </div>
              )}

              {previewStatus === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm">
                  Could not show PDF preview.
                </div>
              )}

              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full bg-white"
              />

              <div
                onMouseDown={handleSignatureMouseDown}
                className="absolute z-20 cursor-move rounded-lg border-2 border-blue-500 bg-blue-50/40 px-4 py-2 shadow-lg"
                style={{
                  left: `${signaturePosition.x}%`,
                  top: `${signaturePosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  color: signatureColor,
                  fontSize: `${fontSize}px`,
                  fontFamily: activeStyle.fontFamily,
                  fontStyle: activeStyle.fontStyle,
                  fontWeight: activeStyle.fontWeight
                }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                  <Move size={10} />
                  Drag signature
                </div>
                {signatureText || 'Your Signature'}
              </div>
            </div>
          </div>
        </main>

        <aside className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Signature Settings
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Type your signature, choose a real font, drag it to the right position, then sign the PDF.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Signature Text
              </label>

              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Type your name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Signature Font
              </label>

              <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
                {signatureStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSignatureStyle(style.id)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      signatureStyle === style.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-600">
                        {style.label}
                      </span>

                      {style.isPremium && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                    </div>

                    <div
                      className="mt-1 text-3xl text-slate-800 truncate"
                      style={{
                        fontFamily: style.fontFamily,
                        fontStyle: style.fontStyle,
                        fontWeight: style.fontWeight
                      }}
                    >
                      {signatureText || 'Your Signature'}
                    </div>

                    {signatureStyle === style.id && (
                      <div className="mt-1 text-[10px] font-bold text-blue-600">
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Signature Size ({fontSize}px)
              </label>

              <input
                type="range"
                min={16}
                max={96}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Signature Color
              </label>

              <div className="flex gap-2">
                {['#0f172a', '#1d4ed8', '#dc2626', '#047857', '#000000'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSignatureColor(color)}
                    className={`h-8 w-8 rounded-full border ${
                      signatureColor === color ? 'ring-2 ring-blue-500 ring-offset-2' : 'border-slate-200'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                Position
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">X</span>
                  <p className="font-mono font-bold">{signaturePosition.x.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-400">Y</span>
                  <p className="font-mono font-bold">{signaturePosition.y.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-400">Page</span>
                  <p className="font-mono font-bold">{currentPage}</p>
                </div>
                <div>
                  <span className="text-slate-400">Size</span>
                  <p className="font-mono font-bold">{fontSize}px</p>
                </div>
              </div>
            </div>

            {status === 'success' && result && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                  <CheckCircle size={16} />
                  Signature Added
                </div>

                <p className="text-xs text-emerald-700 mb-3">
                  Your signed PDF is ready.
                </p>

                <a
                  href={result.downloadUrl}
                  download={result.fileName}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2"
                >
                  <Download size={14} />
                  Download Signed PDF
                </a>
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2">
                  <AlertCircle size={16} />
                  Signing Failed
                </div>

                <p className="text-xs text-red-700">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700 leading-relaxed">
              <div className="flex items-center gap-2 font-bold mb-1">
                <FileText size={14} />
                Note
              </div>
              Choose a signature style, adjust the size and color, then place it anywhere on your PDF.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}