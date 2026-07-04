import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Highlighter,
  Type,
  Pencil,
  Download,
  Loader2,
  Trash2,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Move,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { processPdfTool } from '../services/api';
import type { ProcessingResult } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface AnnotatePdfWorkspaceProps {
  file: File;
  fileName: string;
  onBack: () => void;
  onActionProcessed: () => void;
}

type AnnotationTool = 'text' | 'highlight' | 'draw';

interface AnnotationPoint {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  type: AnnotationTool;
  page: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  opacity?: number;
  fontSize?: number;
  thickness?: number;
  points?: AnnotationPoint[];
}

export default function AnnotatePdfWorkspace({
  file,
  fileName,
  onBack,
  onActionProcessed
}: AnnotatePdfWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.35);
  const [canvasSize, setCanvasSize] = useState({ width: 560, height: 740 });

  const [activeTool, setActiveTool] = useState<AnnotationTool>('text');
  const [annotationText, setAnnotationText] = useState('Add note');
  const [annotationColor, setAnnotationColor] = useState('#2563eb');
  const [fontSize, setFontSize] = useState(18);
  const [highlightOpacity, setHighlightOpacity] = useState(0.35);
  const [lineThickness, setLineThickness] = useState(3);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawPoints, setCurrentDrawPoints] = useState<AnnotationPoint[]>([]);

  const [isHighlighting, setIsHighlighting] = useState(false);
  const [highlightStart, setHighlightStart] = useState<AnnotationPoint | null>(null);
  const [highlightPreview, setHighlightPreview] = useState<Annotation | null>(null);

  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);

  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const currentPageAnnotations = annotations.filter(
    (annotation) => annotation.page === currentPage
  );

  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };

  const percentToPixel = (point: AnnotationPoint) => {
    return {
      x: (point.x / 100) * canvasSize.width,
      y: (point.y / 100) * canvasSize.height
    };
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

        const viewport = page.getViewport({ scale: zoom });
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
  }, [pdfDoc, currentPage, zoom]);

  const getMousePercent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = pageRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
    };
  };

  const addTextAnnotation = (x: number, y: number) => {
    const text = annotationText.trim();

    if (!text) {
      setStatus('error');
      setErrorMessage('Please type a note before adding text.');
      return;
    }

    setStatus('idle');
    setErrorMessage('');

    setAnnotations((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        type: 'text',
        page: currentPage,
        x,
        y,
        text,
        color: annotationColor,
        fontSize,
        opacity: 1
      }
    ]);
  };

  const handlePageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (previewStatus !== 'ready') return;

    const mouse = getMousePercent(e);

    if (activeTool === 'text') {
      addTextAnnotation(mouse.x, mouse.y);
      return;
    }

    if (activeTool === 'highlight') {
      setIsHighlighting(true);
      setHighlightStart(mouse);
      setHighlightPreview({
        id: 'preview-highlight',
        type: 'highlight',
        page: currentPage,
        x: mouse.x,
        y: mouse.y,
        width: 0,
        height: 0,
        color: annotationColor,
        opacity: highlightOpacity
      });
      return;
    }

    if (activeTool === 'draw') {
      setIsDrawing(true);
      setCurrentDrawPoints([mouse]);
    }
  };

  const handlePageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const mouse = getMousePercent(e);

    if (draggingTextId) {
      setAnnotations((items) =>
        items.map((annotation) =>
          annotation.id === draggingTextId
            ? {
                ...annotation,
                x: mouse.x,
                y: mouse.y
              }
            : annotation
        )
      );
      return;
    }

    if (isHighlighting && highlightStart) {
      const x = Math.min(highlightStart.x, mouse.x);
      const y = Math.min(highlightStart.y, mouse.y);
      const width = Math.abs(mouse.x - highlightStart.x);
      const height = Math.abs(mouse.y - highlightStart.y);

      setHighlightPreview({
        id: 'preview-highlight',
        type: 'highlight',
        page: currentPage,
        x,
        y,
        width,
        height,
        color: annotationColor,
        opacity: highlightOpacity
      });
      return;
    }

    if (isDrawing && activeTool === 'draw') {
      setCurrentDrawPoints((points) => [...points, mouse]);
    }
  };

  const finishAction = () => {
    if (draggingTextId) {
      setDraggingTextId(null);
      return;
    }

    if (isHighlighting && highlightPreview) {
      setIsHighlighting(false);
      setHighlightStart(null);

      if ((highlightPreview.width || 0) > 1 && (highlightPreview.height || 0) > 1) {
        setAnnotations((items) => [
          ...items,
          {
            ...highlightPreview,
            id: crypto.randomUUID()
          }
        ]);
      }

      setHighlightPreview(null);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);

      if (currentDrawPoints.length >= 2) {
        setAnnotations((items) => [
          ...items,
          {
            id: crypto.randomUUID(),
            type: 'draw',
            page: currentPage,
            color: annotationColor,
            opacity: 1,
            thickness: lineThickness,
            points: currentDrawPoints
          }
        ]);
      }

      setCurrentDrawPoints([]);
    }
  };

  const zoomOut = () => {
    setZoom((value) => clamp(Number((value - 0.15).toFixed(2)), 0.75, 2.25));
  };

  const zoomIn = () => {
    setZoom((value) => clamp(Number((value + 0.15).toFixed(2)), 0.75, 2.25));
  };

  const resetZoom = () => {
    setZoom(1.35);
  };

  const goPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goNextPage = () => {
    setCurrentPage((page) => Math.min(pageCount, page + 1));
  };

  const clearCurrentPage = () => {
    setAnnotations((items) => items.filter((annotation) => annotation.page !== currentPage));
  };

  const clearAllAnnotations = () => {
    setAnnotations([]);
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations((items) => items.filter((annotation) => annotation.id !== id));
  };

  const handleSaveAnnotations = async () => {
    if (!annotations.length) {
      setStatus('error');
      setErrorMessage('Please add at least one annotation before saving.');
      return;
    }

    try {
      setStatus('processing');
      setErrorMessage('');

      const res = await processPdfTool('annotate-pdf', [file], {
        annotations
      });

      setResult(res);
      setStatus('success');
      onActionProcessed();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to annotate this PDF.');
      setStatus('error');
    }
  };

  const renderHighlight = (annotation: Annotation, isPreview = false) => {
    return (
      <div
        key={annotation.id}
        className={`absolute z-20 border border-yellow-500/40 ${
          isPreview ? 'pointer-events-none' : 'cursor-pointer hover:ring-2 hover:ring-blue-500'
        }`}
        onDoubleClick={() => !isPreview && deleteAnnotation(annotation.id)}
        title={isPreview ? '' : 'Double click to remove'}
        style={{
          left: `${annotation.x}%`,
          top: `${annotation.y}%`,
          width: `${annotation.width}%`,
          height: `${annotation.height}%`,
          backgroundColor: annotation.color,
          opacity: annotation.opacity || highlightOpacity
        }}
      />
    );
  };

  const renderDrawLine = (annotation: Annotation, isPreview = false) => {
    const drawPoints = annotation.points || [];

    if (drawPoints.length < 2) return null;

    const points = drawPoints
      .map((point) => {
        const pixel = percentToPixel(point);
        return `${pixel.x},${pixel.y}`;
      })
      .join(' ');

    return (
      <svg
        key={annotation.id}
        className={`absolute inset-0 ${isPreview ? 'z-30' : 'z-20'} pointer-events-none`}
        width={canvasSize.width}
        height={canvasSize.height}
        viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke={annotation.color}
          strokeWidth={annotation.thickness || lineThickness}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const renderAnnotation = (annotation: Annotation) => {
    if (annotation.type === 'text') {
      return (
        <div
          key={annotation.id}
          className="absolute z-30 cursor-move rounded border border-transparent px-1 hover:border-blue-500 hover:bg-blue-50/40"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingTextId(annotation.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            deleteAnnotation(annotation.id);
          }}
          title="Drag to move. Double click to remove."
          style={{
            left: `${annotation.x}%`,
            top: `${annotation.y}%`,
            color: annotation.color,
            fontSize: `${annotation.fontSize || fontSize}px`,
            transform: 'translateY(-100%)',
            fontWeight: 700
          }}
        >
          <span className="inline-flex items-center gap-1">
            <Move size={12} />
            {annotation.text}
          </span>
        </div>
      );
    }

    if (annotation.type === 'highlight') {
      return renderHighlight(annotation);
    }

    if (annotation.type === 'draw') {
      return renderDrawLine(annotation);
    }

    return null;
  };

  const renderCurrentDrawing = () => {
    if (!currentDrawPoints.length) return null;

    return renderDrawLine(
      {
        id: 'current-drawing',
        type: 'draw',
        page: currentPage,
        color: annotationColor,
        opacity: 1,
        thickness: lineThickness,
        points: currentDrawPoints
      },
      true
    );
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
              <Pencil size={16} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800 truncate max-w-[360px]">
                Annotate PDF
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-[360px]">
                {fileName}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveAnnotations}
          disabled={status === 'processing' || previewStatus !== 'ready'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm"
        >
          {status === 'processing' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Download size={14} />
              Save PDF
            </>
          )}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-8 flex justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
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

              <div className="h-5 w-px bg-slate-200 mx-1" />

              <button
                onClick={zoomOut}
                disabled={zoom <= 0.75}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>

              <button
                onClick={resetZoom}
                className="min-w-[54px] text-xs font-bold text-slate-600 hover:text-blue-600"
                title="Reset zoom"
              >
                {Math.round((zoom / 1.35) * 100)}%
              </button>

              <button
                onClick={zoomIn}
                disabled={zoom >= 2.25}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            <div
              ref={pageRef}
              onMouseDown={handlePageMouseDown}
              onMouseMove={handlePageMouseMove}
              onMouseUp={finishAction}
              onMouseLeave={finishAction}
              className={`relative bg-white shadow-2xl border border-slate-300 select-none overflow-hidden ${
                activeTool === 'draw' || activeTool === 'highlight' ? 'cursor-crosshair' : 'cursor-pointer'
              }`}
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

              {currentPageAnnotations.map(renderAnnotation)}
              {highlightPreview && renderHighlight(highlightPreview, true)}
              {renderCurrentDrawing()}
            </div>
          </div>
        </main>

        <aside className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Annotation Settings
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Add text notes, drag highlight areas, or draw freely on your PDF.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Tool
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveTool('text')}
                  className={`py-2 rounded-lg text-xs font-bold border flex flex-col items-center gap-1 ${
                    activeTool === 'text'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Type size={15} />
                  Text
                </button>

                <button
                  onClick={() => setActiveTool('highlight')}
                  className={`py-2 rounded-lg text-xs font-bold border flex flex-col items-center gap-1 ${
                    activeTool === 'highlight'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Highlighter size={15} />
                  Highlight
                </button>

                <button
                  onClick={() => setActiveTool('draw')}
                  className={`py-2 rounded-lg text-xs font-bold border flex flex-col items-center gap-1 ${
                    activeTool === 'draw'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Pencil size={15} />
                  Draw
                </button>
              </div>
            </div>

            {activeTool === 'text' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Text Note
                </label>

                <input
                  type="text"
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  placeholder="Type your note"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />

                <p className="text-[11px] text-slate-400 mt-2">
                  Click to add text. Drag the text to move it.
                </p>
              </div>
            )}

            {activeTool === 'highlight' && (
              <p className="text-[11px] text-slate-400">
                Click and drag over the area you want to highlight.
              </p>
            )}

            {activeTool === 'draw' && (
              <p className="text-[11px] text-slate-400">
                Hold and drag your cursor to draw freely.
              </p>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Color
              </label>

              <div className="flex flex-wrap gap-2">
                {['#2563eb', '#facc15', '#dc2626', '#16a34a', '#9333ea', '#0f172a'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setAnnotationColor(color)}
                    className={`h-8 w-8 rounded-full border ${
                      annotationColor === color ? 'ring-2 ring-blue-500 ring-offset-2' : 'border-slate-200'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {activeTool === 'text' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Text Size ({fontSize}px)
                </label>

                <input
                  type="range"
                  min={10}
                  max={48}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            {activeTool === 'highlight' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Highlight Opacity ({Math.round(highlightOpacity * 100)}%)
                </label>

                <input
                  type="range"
                  min={10}
                  max={60}
                  value={Math.round(highlightOpacity * 100)}
                  onChange={(e) => setHighlightOpacity(Number(e.target.value) / 100)}
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            {activeTool === 'draw' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Line Thickness ({lineThickness}px)
                </label>

                <input
                  type="range"
                  min={1}
                  max={12}
                  value={lineThickness}
                  onChange={(e) => setLineThickness(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                Annotations
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <span className="text-slate-400">This Page</span>
                  <p className="font-mono font-bold">{currentPageAnnotations.length}</p>
                </div>
                <div>
                  <span className="text-slate-400">Total</span>
                  <p className="font-mono font-bold">{annotations.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={clearCurrentPage}
                  disabled={!currentPageAnnotations.length}
                  className="py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Clear Page
                </button>

                <button
                  onClick={clearAllAnnotations}
                  disabled={!annotations.length}
                  className="py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Trash2 size={13} />
                  Clear All
                </button>
              </div>
            </div>

            {status === 'success' && result && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                  <CheckCircle size={16} />
                  PDF Annotated
                </div>

                <p className="text-xs text-emerald-700 mb-3">
                  Your annotated PDF is ready.
                </p>

                <a
                  href={result.downloadUrl}
                  download={result.fileName}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2"
                >
                  <Download size={14} />
                  Download Annotated PDF
                </a>
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2">
                  <AlertCircle size={16} />
                  Annotation Failed
                </div>

                <p className="text-xs text-red-700">
                  {errorMessage}
                </p>
              </div>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Double-click a text or highlight annotation to remove it.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}