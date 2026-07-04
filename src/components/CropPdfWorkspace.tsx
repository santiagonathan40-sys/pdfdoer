import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Crop,
  Download,
  Loader2,
  Maximize,
  Move,
  RotateCcw,
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

interface CropPdfWorkspaceProps {
  file: File;
  fileName: string;
  onBack: () => void;
  onActionProcessed: () => void;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragMode =
  | 'move'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | null;

export default function CropPdfWorkspace({
  file,
  fileName,
  onBack,
  onActionProcessed
}: CropPdfWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 560, height: 740 });

  const [cropBox, setCropBox] = useState<CropBox>({
    x: 10,
    y: 10,
    width: 80,
    height: 80
  });

  const [pageMode, setPageMode] = useState<'all' | 'current'>('all');
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [startMouse, setStartMouse] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState<CropBox>(cropBox);

  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };

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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();

    const mouse = getMousePercent(e);

    setDragMode(mode);
    setStartMouse(mouse);
    setStartCrop(cropBox);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragMode) return;

    const mouse = getMousePercent(e);
    const dx = mouse.x - startMouse.x;
    const dy = mouse.y - startMouse.y;

    let next = { ...startCrop };

    if (dragMode === 'move') {
      next.x = clamp(startCrop.x + dx, 0, 100 - startCrop.width);
      next.y = clamp(startCrop.y + dy, 0, 100 - startCrop.height);
    }

    if (dragMode === 'top-left') {
      const newX = clamp(startCrop.x + dx, 0, startCrop.x + startCrop.width - 10);
      const newY = clamp(startCrop.y + dy, 0, startCrop.y + startCrop.height - 10);

      next.width = startCrop.width + (startCrop.x - newX);
      next.height = startCrop.height + (startCrop.y - newY);
      next.x = newX;
      next.y = newY;
    }

    if (dragMode === 'top-right') {
      const newY = clamp(startCrop.y + dy, 0, startCrop.y + startCrop.height - 10);
      const newRight = clamp(startCrop.x + startCrop.width + dx, startCrop.x + 10, 100);

      next.width = newRight - startCrop.x;
      next.height = startCrop.height + (startCrop.y - newY);
      next.y = newY;
    }

    if (dragMode === 'bottom-left') {
      const newX = clamp(startCrop.x + dx, 0, startCrop.x + startCrop.width - 10);
      const newBottom = clamp(startCrop.y + startCrop.height + dy, startCrop.y + 10, 100);

      next.width = startCrop.width + (startCrop.x - newX);
      next.height = newBottom - startCrop.y;
      next.x = newX;
    }

    if (dragMode === 'bottom-right') {
      const newRight = clamp(startCrop.x + startCrop.width + dx, startCrop.x + 10, 100);
      const newBottom = clamp(startCrop.y + startCrop.height + dy, startCrop.y + 10, 100);

      next.width = newRight - startCrop.x;
      next.height = newBottom - startCrop.y;
    }

    next = {
      x: clamp(next.x, 0, 100),
      y: clamp(next.y, 0, 100),
      width: clamp(next.width, 10, 100),
      height: clamp(next.height, 10, 100)
    };

    if (next.x + next.width > 100) {
      next.width = 100 - next.x;
    }

    if (next.y + next.height > 100) {
      next.height = 100 - next.y;
    }

    setCropBox(next);
  };

  const handleMouseUp = () => {
    setDragMode(null);
  };

  const resetCrop = () => {
    setCropBox({
      x: 10,
      y: 10,
      width: 80,
      height: 80
    });
  };

  const fullPageCrop = () => {
    setCropBox({
      x: 0,
      y: 0,
      width: 100,
      height: 100
    });
  };

  const goPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goNextPage = () => {
    setCurrentPage((page) => Math.min(pageCount, page + 1));
  };

  const handleCropPdf = async () => {
    try {
      setStatus('processing');
      setErrorMessage('');

      const res = await processPdfTool('crop-pdf', [file], {
        cropBox,
        pageMode,
        currentPage
      });

      setResult(res);
      setStatus('success');
      onActionProcessed();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to crop this PDF.');
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
              <Crop size={16} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800 truncate max-w-[360px]">
                Crop PDF
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-[360px]">
                {fileName}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleCropPdf}
          disabled={status === 'processing' || previewStatus !== 'ready'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm"
        >
          {status === 'processing' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Cropping...
            </>
          ) : (
            <>
              <Download size={14} />
              Crop PDF
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

              <div className="absolute inset-0 bg-slate-900/35 pointer-events-none" />

              <div
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                className="absolute border-2 border-blue-500 bg-white/5 cursor-move shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] z-20"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`
                }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
                  Drag to move crop area
                </div>

                <div
                  onMouseDown={(e) => handleMouseDown(e, 'top-left')}
                  className="absolute -top-2 -left-2 h-4 w-4 bg-white border-2 border-blue-600 rounded cursor-nwse-resize"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'top-right')}
                  className="absolute -top-2 -right-2 h-4 w-4 bg-white border-2 border-blue-600 rounded cursor-nesw-resize"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
                  className="absolute -bottom-2 -left-2 h-4 w-4 bg-white border-2 border-blue-600 rounded cursor-nesw-resize"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
                  className="absolute -bottom-2 -right-2 h-4 w-4 bg-white border-2 border-blue-600 rounded cursor-nwse-resize"
                />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/90 text-slate-700 text-xs font-bold rounded-lg px-3 py-1 flex items-center gap-1">
                    <Move size={12} />
                    {Math.round(cropBox.width)}% × {Math.round(cropBox.height)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Crop Settings
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Drag the blue crop area and resize it using the corner handles.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Apply crop to
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPageMode('all')}
                  className={`py-2 rounded-lg text-xs font-bold border ${
                    pageMode === 'all'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Pages
                </button>

                <button
                  onClick={() => setPageMode('current')}
                  className={`py-2 rounded-lg text-xs font-bold border ${
                    pageMode === 'current'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Current Page
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                Crop Box
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">X</span>
                  <p className="font-mono font-bold">{cropBox.x.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-400">Y</span>
                  <p className="font-mono font-bold">{cropBox.y.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-400">Width</span>
                  <p className="font-mono font-bold">{cropBox.width.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-400">Height</span>
                  <p className="font-mono font-bold">{cropBox.height.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={resetCrop}
                className="py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1"
              >
                <RotateCcw size={13} />
                Reset
              </button>

              <button
                onClick={fullPageCrop}
                className="py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1"
              >
                <Maximize size={13} />
                Full Page
              </button>
            </div>

            {status === 'success' && result && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                  <CheckCircle size={16} />
                  Crop Complete
                </div>

                <p className="text-xs text-emerald-700 mb-3">
                  Your cropped PDF is ready.
                </p>

                <a
                  href={result.downloadUrl}
                  download={result.fileName}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2"
                >
                  <Download size={14} />
                  Download Cropped PDF
                </a>
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2">
                  <AlertCircle size={16} />
                  Crop Failed
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
             Adjust the crop area, choose the pages you want to apply it to, then download your cropped PDF.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}