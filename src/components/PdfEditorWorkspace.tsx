import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Save, Download, Plus, Trash2, ChevronUp, ChevronDown, 
  ZoomIn, ZoomOut, Maximize, Type, Highlighter, Brush, Image as ImageIcon, 
  PenTool, Square, Circle, ArrowRight, Eraser, Stamp, RotateCw, Crop, 
  Check, X, Undo, Redo, Sparkles, Loader2, Info, AlertCircle, FileText
} from 'lucide-react';

interface PdfElement {
  id: string;
  type: 'text' | 'highlight' | 'signature' | 'image' | 'shape' | 'watermark';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  fontSize?: number;
  shapeType?: 'rect' | 'circle' | 'arrow';
  imageUrl?: string;
  rotation?: number;
  opacity?: number;
}

interface PdfDrawing {
  id: string;
  points: string;
  color: string;
  strokeWidth: number;
}

interface PdfPage {
  id: string;
  pageNumber: number;
  rotation: number;
  isCropped: boolean;
  cropMargin: { top: number; right: number; bottom: number; left: number };
  elements: PdfElement[];
  drawings: PdfDrawing[];
}

interface PdfEditorWorkspaceProps {
  fileName: string;
  onBack: () => void;
  onActionProcessed: () => void;
}

export default function PdfEditorWorkspace({ fileName, onBack, onActionProcessed }: PdfEditorWorkspaceProps) {
  const [pages, setPages] = useState<PdfPage[]>([
    {
      id: 'p1',
      pageNumber: 1,
      rotation: 0,
      isCropped: false,
      cropMargin: { top: 10, right: 10, bottom: 10, left: 10 },
      drawings: [],
      elements: [
        {
          id: 'e1',
          type: 'text',
          x: 20,
          y: 20,
          content: 'Agreement for Digital Services',
          fontSize: 20,
          color: '#1e293b'
        },
        {
          id: 'e2',
          type: 'text',
          x: 20,
          y: 28,
          content: 'Please read the terms below carefully and add your signature at the bottom.',
          fontSize: 12,
          color: '#64748b'
        }
      ]
    },
    {
      id: 'p2',
      pageNumber: 2,
      rotation: 0,
      isCropped: false,
      cropMargin: { top: 10, right: 10, bottom: 10, left: 10 },
      drawings: [],
      elements: [
        {
          id: 'e3',
          type: 'text',
          x: 20,
          y: 15,
          content: 'Section 4: Confidentiality & Non-Disclosure',
          fontSize: 14,
          color: '#0f172a'
        },
        {
          id: 'e4',
          type: 'highlight',
          x: 19,
          y: 14.5,
          width: 45,
          height: 3,
          color: '#fef08a'
        }
      ]
    }
  ]);

  const [activePageId, setActivePageId] = useState<string>('p1');
  const [zoom, setZoom] = useState<number>(100);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [drawColor, setDrawColor] = useState<string>('#3b82f6');
  const [drawThickness, setDrawThickness] = useState<number>(4);
  const [shapeType, setShapeType] = useState<'rect' | 'circle' | 'arrow'>('rect');
  
  const [watermarkTextInput, setWatermarkTextInput] = useState<string>('CONFIDENTIAL');
  const [watermarkRotation, setWatermarkRotation] = useState<number>(-35);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.2);

  const [signatureModalOpen, setSignatureModalOpen] = useState<boolean>(false);
  const [signatureType, setSignatureType] = useState<'type' | 'draw'>('type');
  const [sigTextInput, setSigTextInput] = useState<string>('John Doe');
  const [sigTextFont, setSigTextFont] = useState<string>('font-signature-1');
  const [sigDrawColor, setSigDrawColor] = useState<string>('#0f172a');
  const [isDrawingSig, setIsDrawingSig] = useState<boolean>(false);
  const [sigPoints, setSigPoints] = useState<{ x: number; y: number }[]>([]);

  const [isDrawingOnCanvas, setIsDrawingOnCanvas] = useState<boolean>(false);
  const [canvasDrawingPoints, setCanvasDrawingPoints] = useState<{ x: number; y: number }[]>([]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'downloading' | 'success'>('idle');
  const [savingStep, setSavingStep] = useState<number>(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigCanvasRef = useRef<SVGSVGElement>(null);

  const activePage = pages.find(p => p.id === activePageId) || pages[0];

  const sigFonts = [
    { id: 'font-signature-1', name: 'Elegant Brush', family: '"Dancing Script", cursive, Georgia' },
    { id: 'font-signature-2', name: 'Classic Script', family: '"Caveat", cursive, serif' },
    { id: 'font-signature-3', name: 'Modern Signature', family: '"Sacramento", cursive, sans-serif' },
    { id: 'font-signature-4', name: 'Formal Cursive', family: '"Great Vibes", cursive, Times' }
  ];

  const saveProgressSteps = [
    'Parsing interactive overlay elements...',
    'Flattening vector annotations and signatures...',
    'Encrypting modified layout coordinates...',
    'Rendering updated document thumbnails...',
    'Rebuilding optimized PDF file stream...'
  ];

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Sacramento&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    setSelectedElementId(null);
  }, [activeTool, activePageId]);

  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    const newPageId = `p-${Date.now()}`;
    const newPage: PdfPage = {
      id: newPageId,
      pageNumber: newPageNum,
      rotation: 0,
      isCropped: false,
      cropMargin: { top: 10, right: 10, bottom: 10, left: 10 },
      drawings: [],
      elements: [
        {
          id: `e-new-${Date.now()}`,
          type: 'text',
          x: 50,
          y: 48,
          content: `Blank Page ${newPageNum}`,
          fontSize: 14,
          color: '#cbd5e1'
        }
      ]
    };
    setPages([...pages, newPage]);
    setActivePageId(newPageId);
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) {
      alert("A PDF must have at least one page.");
      return;
    }
    const filtered = pages.filter(p => p.id !== activePageId);
    const renumbered = filtered.map((p, idx) => ({
      ...p,
      pageNumber: idx + 1
    }));
    setPages(renumbered);
    const activeIdx = pages.findIndex(p => p.id === activePageId);
    const nextActiveIdx = Math.max(0, activeIdx - 1);
    setActivePageId(renumbered[nextActiveIdx].id);
  };

  const handleMovePageUp = () => {
    const idx = pages.findIndex(p => p.id === activePageId);
    if (idx === 0) return;
    const updated = [...pages];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;
    
    const renumbered = updated.map((p, i) => ({ ...p, pageNumber: i + 1 }));
    setPages(renumbered);
  };

  const handleMovePageDown = () => {
    const idx = pages.findIndex(p => p.id === activePageId);
    if (idx === pages.length - 1) return;
    const updated = [...pages];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;

    const renumbered = updated.map((p, i) => ({ ...p, pageNumber: i + 1 }));
    setPages(renumbered);
  };

  const handleRotatePage = () => {
    setPages(pages.map(p => {
      if (p.id === activePageId) {
        return {
          ...p,
          rotation: (p.rotation + 90) % 360
        };
      }
      return p;
    }));
  };

  const handleCropPage = () => {
    setPages(pages.map(p => {
      if (p.id === activePageId) {
        return {
          ...p,
          isCropped: !p.isCropped
        };
      }
      return p;
    }));
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 25, 200));
  const handleZoomOut = () => setZoom(Math.max(zoom - 25, 50));
  const handleZoomReset = () => setZoom(100);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || isDrawingOnCanvas) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    let newElement: PdfElement | null = null;
    const uniqueId = `e-${Date.now()}`;

    switch (activeTool) {
      case 'text':
        newElement = {
          id: uniqueId,
          type: 'text',
          x: clickX,
          y: clickY,
          content: 'Double click to edit text',
          fontSize: 14,
          color: drawColor
        };
        break;
      case 'highlight':
        newElement = {
          id: uniqueId,
          type: 'highlight',
          x: clickX - 10,
          y: clickY - 1.5,
          width: 20,
          height: 3,
          color: '#fef08a'
        };
        break;
      case 'shape':
        newElement = {
          id: uniqueId,
          type: 'shape',
          shapeType: shapeType,
          x: clickX - 10,
          y: clickY - 10,
          width: 20,
          height: 15,
          color: drawColor
        };
        break;
      case 'watermark':
        newElement = {
          id: uniqueId,
          type: 'watermark',
          x: 50,
          y: 50,
          content: watermarkTextInput,
          rotation: watermarkRotation,
          opacity: watermarkOpacity,
          fontSize: 32,
          color: '#94a3b8'
        };
        break;
      default:
        break;
    }

    if (newElement) {
      setPages(pages.map(p => {
        if (p.id === activePageId) {
          return {
            ...p,
            elements: [...p.elements, newElement!]
          };
        }
        return p;
      }));
      setSelectedElementId(uniqueId);
      setActiveTool('select');
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'draw') return;
    setIsDrawingOnCanvas(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCanvasDrawingPoints([{ x, y }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingOnCanvas || activeTool !== 'draw') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCanvasDrawingPoints(prev => [...prev, { x, y }]);
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawingOnCanvas || activeTool !== 'draw') return;
    setIsDrawingOnCanvas(false);
    
    if (canvasDrawingPoints.length < 2) {
      setCanvasDrawingPoints([]);
      return;
    }

    let d = `M ${canvasDrawingPoints[0].x} ${canvasDrawingPoints[0].y}`;
    for (let i = 1; i < canvasDrawingPoints.length; i++) {
      d += ` L ${canvasDrawingPoints[i].x} ${canvasDrawingPoints[i].y}`;
    }

    const newDrawing: PdfDrawing = {
      id: `draw-${Date.now()}`,
      points: d,
      color: drawColor,
      strokeWidth: drawThickness
    };

    setPages(pages.map(p => {
      if (p.id === activePageId) {
        return {
          ...p,
          drawings: [...p.drawings, newDrawing]
        };
      }
      return p;
    }));

    setCanvasDrawingPoints([]);
  };

  const handleOpenSignatureModal = () => {
    setSigPoints([]);
    setSigTextInput('John Doe');
    setSignatureModalOpen(true);
  };

  const handleSigDrawStart = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDrawingSig(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSigPoints([{ x, y }]);
  };

  const handleSigDrawMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingSig) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSigPoints(prev => [...prev, { x, y }]);
  };

  const handleSigDrawEnd = () => {
    setIsDrawingSig(false);
  };

  const handleSaveSignature = () => {
    let signatureElement: PdfElement;
    const uniqueId = `sig-${Date.now()}`;

    if (signatureType === 'type') {
      const chosenFont = sigFonts.find(f => f.id === sigTextFont);
      signatureElement = {
        id: uniqueId,
        type: 'signature',
        x: 40,
        y: 75,
        content: sigTextInput,
        color: sigDrawColor,
        fontSize: 24,
        shapeType: 'circle'
      };
    } else {
      if (sigPoints.length < 2) {
        alert("Please draw your signature before saving.");
        return;
      }
      let d = `M ${sigPoints[0].x} ${sigPoints[0].y}`;
      for (let i = 1; i < sigPoints.length; i++) {
        d += ` L ${sigPoints[i].x} ${sigPoints[i].y}`;
      }

      const svgContent = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><path d="${d}" fill="none" stroke="${encodeURIComponent(sigDrawColor)}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

      signatureElement = {
        id: uniqueId,
        type: 'signature',
        x: 40,
        y: 75,
        imageUrl: svgContent,
        width: 150,
        height: 75
      };
    }

    setPages(pages.map(p => {
      if (p.id === activePageId) {
        return {
          ...p,
          elements: [...p.elements, signatureElement]
        };
      }
      return p;
    }));

    setSelectedElementId(uniqueId);
    setSignatureModalOpen(false);
  };

  const handleTriggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const uniqueId = `img-${Date.now()}`;
      const newImageElement: PdfElement = {
        id: uniqueId,
        type: 'image',
        x: 35,
        y: 35,
        width: 120,
        height: 100,
        imageUrl: dataUrl
      };

      setPages(pages.map(p => {
        if (p.id === activePageId) {
          return {
            ...p,
            elements: [...p.elements, newImageElement]
          };
        }
        return p;
      }));

      setSelectedElementId(uniqueId);
      setActiveTool('select');
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateElementContent = (elementId: string, text: string) => {
    setPages(pages.map(p => ({
      ...p,
      elements: p.elements.map(el => {
        if (el.id === elementId) {
          return { ...el, content: text };
        }
        return el;
      })
    })));
  };

  const handleUpdateElementColor = (elementId: string, color: string) => {
    setPages(pages.map(p => ({
      ...p,
      elements: p.elements.map(el => {
        if (el.id === elementId) {
          return { ...el, color };
        }
        return el;
      })
    })));
  };

  const handleUpdateElementSize = (elementId: string, factor: number) => {
    setPages(pages.map(p => ({
      ...p,
      elements: p.elements.map(el => {
        if (el.id === elementId) {
          if (el.type === 'text') {
            return { ...el, fontSize: Math.max(8, (el.fontSize || 12) + factor) };
          } else if (el.type === 'image' || el.type === 'signature') {
            return { 
              ...el, 
              width: Math.max(40, (el.width || 100) + factor * 10),
              height: Math.max(30, (el.height || 80) + factor * 8)
            };
          }
        }
        return el;
      })
    })));
  };

  const handleDeleteElement = (elementId: string) => {
    setPages(pages.map(p => ({
      ...p,
      elements: p.elements.filter(el => el.id !== elementId)
    })));
    setSelectedElementId(null);
  };

  const handleClearDrawings = () => {
    setPages(pages.map(p => {
      if (p.id === activePageId) {
        return {
          ...p,
          drawings: []
        };
      }
      return p;
    }));
  };

  const handleProcessSave = (mode: 'save' | 'download') => {
    setSaveStatus(mode === 'save' ? 'saving' : 'downloading');
    setSavingStep(0);

    const interval = setInterval(() => {
      setSavingStep(prev => {
        if (prev >= saveProgressSteps.length - 1) {
          clearInterval(interval);
          setSaveStatus('success');
          onActionProcessed();
          return prev;
        }
        return prev + 1;
      });
    }, 850);
  };

  const getFontFamily = (fontId: string) => {
    const f = sigFonts.find(x => x.id === fontId);
    return f ? f.family : 'cursive';
  };

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800" id="pdf-editor-workspace">
      
      
      <header className="bg-white border-b border-slate-200 h-14 shrink-0 px-4 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            title="Exit Editor"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="h-4 w-px bg-slate-200" />
          
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
              <FileText size={16} />
            </div>
            <span className="font-display text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[340px]">
              {fileName}
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
              EDIT MODE
            </span>
          </div>
        </div>

        
        <div className="flex items-center space-x-2.5">
          
          <div className="hidden md:flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 mr-2 text-xs">
            <button 
              onClick={handleZoomOut}
              className="p-1 hover:bg-white hover:text-blue-600 rounded text-slate-400 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="px-2 font-mono font-bold text-slate-600 min-w-[36px] text-center">
              {zoom}%
            </span>
            <button 
              onClick={handleZoomIn}
              className="p-1 hover:bg-white hover:text-blue-600 rounded text-slate-400 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button 
              onClick={handleZoomReset}
              className="p-1 hover:bg-white text-slate-400 hover:text-slate-600 rounded text-[10px] font-bold px-1.5"
              title="Reset Zoom"
            >
              Fit
            </button>
          </div>

          <button 
            onClick={() => handleProcessSave('save')}
            className="px-3.5 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Save size={14} className="text-slate-400" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>
          
          <button 
            onClick={() => handleProcessSave('download')}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shadow-md shadow-blue-100 cursor-pointer"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>
      </header>

      
      <div className="flex-1 flex overflow-hidden relative">
        
        
        <aside className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 hidden md:flex">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pages ({pages.length})</span>
            
            <button 
              onClick={handleAddPage}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
              title="Insert Blank Page"
            >
              <Plus size={15} />
            </button>
          </div>

          
          <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
            {pages.map((p) => (
              <div 
                key={p.id}
                onClick={() => setActivePageId(p.id)}
                className={`group relative p-2 rounded-xl border transition-all cursor-pointer ${
                  activePageId === p.id 
                    ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-100' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                
                <div className="aspect-[3/4] rounded bg-white border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between p-2">
                  
                  <div className="space-y-1">
                    <div className="h-1 w-1/2 bg-slate-200 rounded" />
                    <div className="h-1 w-3/4 bg-slate-100 rounded" />
                    <div className="h-1 w-2/3 bg-slate-100 rounded" />
                  </div>

                  
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-slate-400 font-mono">P. {p.pageNumber}</span>
                    {p.elements.length > 0 && (
                      <span className="text-[8px] px-1 py-0.2 bg-blue-500 text-white rounded font-bold font-mono">
                        +{p.elements.length}
                      </span>
                    )}
                  </div>

                  
                  {p.drawings.length > 0 && (
                    <div className="absolute inset-0 opacity-40 pointer-events-none">
                      <svg viewBox="0 0 200 270" className="w-full h-full">
                        {p.drawings.map(d => (
                          <path key={d.id} d={d.points} fill="none" stroke={d.color} strokeWidth={d.strokeWidth * 1.5} />
                        ))}
                      </svg>
                    </div>
                  )}

                  
                  {p.rotation !== 0 && (
                    <div className="absolute top-1 right-1 p-0.5 bg-blue-500 text-white rounded-full">
                      <RotateCw size={6} style={{ transform: `rotate(${p.rotation}deg)` }} />
                    </div>
                  )}
                </div>

                
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex space-x-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMovePageUp(); }}
                      disabled={p.pageNumber === 1}
                      className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMovePageDown(); }}
                      disabled={p.pageNumber === pages.length}
                      className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); setActivePageId(p.id); handleDeletePage(); }}
                    className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                    title="Delete Page"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}

            <button 
              onClick={handleAddPage}
              className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <Plus size={16} className="mb-1" />
              <span className="text-[11px] font-bold">Add Page</span>
            </button>
          </div>
        </aside>

        
        <main className="flex-1 flex flex-col overflow-hidden relative">
          
          
          <div className="bg-slate-200/60 border-b border-slate-300 h-9 shrink-0 px-4 flex items-center justify-between text-xs text-slate-500 z-10">
            <div className="flex items-center space-x-4">
              <span>Active Page: <strong className="text-slate-700">Page {activePage.pageNumber} of {pages.length}</strong></span>
              <span>•</span>
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Page Rotation: <strong>{activePage.rotation}&deg;</strong></span>
              </span>
            </div>
            
            <div className="flex space-x-3 text-slate-400">
              {activeTool !== 'select' && (
                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-[10px] animate-pulse">
                  Click on document to place '{activeTool}'
                </span>
              )}
            </div>
          </div>

          
          <div className="flex-1 overflow-auto p-8 flex items-start justify-center scrollbar-thin relative bg-slate-100">
            
            
            <div 
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`relative bg-white border border-slate-300 shadow-xl transition-all duration-300 select-none ${
                activeTool === 'draw' ? 'cursor-crosshair' : activeTool !== 'select' ? 'cursor-cell' : 'cursor-default'
              }`}
              style={{
                width: `${540 * (zoom / 100)}px`,
                height: `${720 * (zoom / 100)}px`,
                transform: `rotate(${activePage.rotation}deg)`,
                clipPath: activePage.isCropped ? 'inset(10% 10% 10% 10%)' : 'none'
              }}
            >
              
              <div className="absolute inset-0 p-12 flex flex-col justify-between pointer-events-none opacity-[0.04]">
                <div className="space-y-4">
                  <div className="h-4 bg-slate-900 rounded w-1/3" />
                  <div className="h-3 bg-slate-900 rounded w-5/6" />
                  <div className="h-3 bg-slate-900 rounded w-4/5" />
                  <div className="h-3 bg-slate-900 rounded w-full" />
                  <div className="h-3 bg-slate-900 rounded w-11/12" />
                  <div className="h-3 bg-slate-900 rounded w-2/3" />
                </div>
                <div className="space-y-4">
                  <div className="h-3 bg-slate-900 rounded w-5/6" />
                  <div className="h-3 bg-slate-900 rounded w-4/5" />
                  <div className="h-3 bg-slate-900 rounded w-full" />
                </div>
                <div className="flex justify-between items-center border-t-2 border-slate-900 pt-4">
                  <span className="font-bold text-xs">PDF Doer Document Engine</span>
                  <span className="font-mono text-xs">Page {activePage.pageNumber}</span>
                </div>
              </div>

              
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                
                {activePage.drawings.map((draw) => (
                  <path 
                    key={draw.id} 
                    d={draw.points} 
                    fill="none" 
                    stroke={draw.color} 
                    strokeWidth={draw.strokeWidth} 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                ))}

                
                {isDrawingOnCanvas && canvasDrawingPoints.length > 1 && (
                  <path 
                    d={`M ${canvasDrawingPoints[0].x} ${canvasDrawingPoints[0].y} ` + 
                       canvasDrawingPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')} 
                    fill="none" 
                    stroke={drawColor} 
                    strokeWidth={drawThickness} 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                )}
              </svg>

              
              <div className="absolute inset-0 z-20">
                {activePage.elements.map((el) => {
                  const isSelected = selectedElementId === el.id;
                  
                  return (
                    <div
                      key={el.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(el.id);
                      }}
                      className={`absolute group cursor-pointer transition-all ${
                        isSelected 
                          ? 'ring-2 ring-blue-500 bg-blue-50/10' 
                          : 'hover:ring-1 hover:ring-blue-300'
                      }`}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: el.width ? `${el.width}px` : 'auto',
                        height: el.height ? `${el.height}px` : 'auto',
                        transform: el.type === 'watermark' ? `translate(-50%, -50%) rotate(${el.rotation}deg)` : 'none',
                        opacity: el.opacity !== undefined ? el.opacity : 1,
                      }}
                    >
                      
                      {el.type === 'text' && (
                        <div className="relative p-1">
                          {isSelected ? (
                            <input
                              type="text"
                              value={el.content}
                              onChange={(e) => handleUpdateElementContent(el.id, e.target.value)}
                              className="bg-white border border-blue-500 rounded px-1.5 py-0.5 font-sans outline-none font-medium shadow-sm"
                              style={{ fontSize: `${el.fontSize}px`, color: el.color }}
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="font-sans font-medium break-words leading-normal"
                              style={{ fontSize: `${el.fontSize}px`, color: el.color }}
                            >
                              {el.content}
                            </span>
                          )}
                        </div>
                      )}

                      
                      {el.type === 'highlight' && (
                        <div 
                          className="h-full w-full rounded-sm mix-blend-multiply opacity-80"
                          style={{ 
                            backgroundColor: el.color,
                            width: el.width ? `${el.width}px` : '120px',
                            height: el.height ? `${el.height}px` : '24px'
                          }}
                        />
                      )}

                      
                      {el.type === 'signature' && (
                        <div className="p-1 flex flex-col justify-center items-center">
                          {el.imageUrl ? (
                            <img 
                              src={el.imageUrl} 
                              alt="Signature" 
                              className="h-auto object-contain select-none pointer-events-none"
                              style={{ width: el.width ? `${el.width}px` : '150px' }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span 
                              className="font-medium text-center tracking-wide leading-none"
                              style={{ 
                                fontSize: `${el.fontSize || 24}px`, 
                                color: el.color || '#0f172a',
                                fontFamily: getFontFamily(el.id.includes('font') ? el.id : sigTextFont)
                              }}
                            >
                              {el.content}
                            </span>
                          )}
                          <div className="text-[8px] text-slate-400 font-mono scale-90 mt-0.5">Digitally Verified</div>
                        </div>
                      )}

                      
                      {el.type === 'image' && el.imageUrl && (
                        <img 
                          src={el.imageUrl} 
                          alt="Annotation" 
                          className="w-full h-full object-contain pointer-events-none rounded border border-slate-200"
                        />
                      )}

                      
                      {el.type === 'shape' && (
                        <div className="w-full h-full relative" style={{ minWidth: '40px', minHeight: '30px' }}>
                          {el.shapeType === 'rect' && (
                            <div 
                              className="w-full h-full border-2 rounded-sm"
                              style={{ borderColor: el.color, backgroundColor: `${el.color}15` }}
                            />
                          )}
                          {el.shapeType === 'circle' && (
                            <div 
                              className="w-full h-full border-2 rounded-full"
                              style={{ borderColor: el.color, backgroundColor: `${el.color}15` }}
                            />
                          )}
                          {el.shapeType === 'arrow' && (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-full h-full" viewBox="0 0 100 50">
                                <defs>
                                  <marker id={`arrowhead-${el.id}`} markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill={el.color} />
                                  </marker>
                                </defs>
                                <line 
                                  x1="10" y1="25" x2="85" y2="25" 
                                  stroke={el.color} strokeWidth="3" 
                                  markerEnd={`url(#arrowhead-${el.id})`} 
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      )}

                      
                      {el.type === 'watermark' && (
                        <div className="select-none pointer-events-none opacity-20 text-center font-display uppercase tracking-[0.25em] whitespace-nowrap">
                          <span className="font-extrabold text-slate-400" style={{ fontSize: `${el.fontSize}px` }}>
                            {el.content}
                          </span>
                        </div>
                      )}

                      
                      {isSelected && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg flex items-center space-x-1.5 p-1 z-50">
                          <span className="px-1.5 text-[9px] font-bold text-slate-400 border-r border-slate-700 capitalize">
                            {el.type}
                          </span>
                          
                          
                          {(el.type === 'text' || el.type === 'image' || el.type === 'signature') && (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdateElementSize(el.id, -1); }}
                                className="h-5 w-5 hover:bg-slate-800 rounded flex items-center justify-center font-bold"
                                title="Shrink Element"
                              >
                                A-
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdateElementSize(el.id, 1); }}
                                className="h-5 w-5 hover:bg-slate-800 rounded flex items-center justify-center font-bold"
                                title="Grow Element"
                              >
                                A+
                              </button>
                            </>
                          )}

                          
                          {(el.type === 'text' || el.type === 'shape') && (
                            <div className="flex space-x-1 border-l border-slate-700 pl-1.5 pr-0.5">
                              {['#ef4444', '#10b981', '#3b82f6', '#0f172a'].map(col => (
                                <button
                                  key={col}
                                  onClick={(e) => { e.stopPropagation(); handleUpdateElementColor(el.id, col); }}
                                  className={`h-3 w-3 rounded-full border border-white/20 ${el.color === col ? 'ring-2 ring-white scale-110' : ''}`}
                                  style={{ backgroundColor: col }}
                                />
                              ))}
                            </div>
                          )}

                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteElement(el.id); }}
                            className="p-1 hover:bg-red-500 rounded text-red-400 hover:text-white transition-colors"
                            title="Delete Annotation"
                          >
                            <Trash2 size={11} />
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedElementId(null); }}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400"
                            title="Dismiss Controls"
                          >
                            <Check size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            
            {activePage.isCropped && (
              <div className="absolute inset-0 bg-slate-900/40 pointer-events-none flex items-center justify-center z-20">
                <div className="border-2 border-dashed border-blue-500 w-[70%] h-[70%] bg-transparent relative flex items-center justify-center">
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full absolute -top-3">
                    Active Crop Region (80%)
                  </span>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-600" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-600" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-600" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-600" />
                </div>
              </div>
            )}
          </div>
        </main>

        
        <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10 scrollbar-thin overflow-y-auto">
          
          
          <div className="p-4 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Annotation Tools</span>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'select', label: 'Select', icon: PenTool, desc: 'Interact with elements' },
                { id: 'text', label: 'Add Text', icon: Type, desc: 'Type onto PDF page' },
                { id: 'highlight', label: 'Highlight', icon: Highlighter, desc: 'Marker highlighter' },
                { id: 'draw', label: 'Free Draw', icon: Brush, desc: 'Draw freehand sketch' },
                { id: 'image', label: 'Add Image', icon: ImageIcon, desc: 'Upload PNG/JPG' },
                { id: 'signature', label: 'Signature', icon: Stamp, desc: 'Sign drawing/typed' },
                { id: 'shape', label: 'Add Shape', icon: Square, desc: 'Rect, Circle, Arrow' },
                { id: 'watermark', label: 'Watermark', icon: Stamp, desc: 'Place document stamp' },
              ].map((tool) => {
                const Icon = tool.icon;
                const isSelected = activeTool === tool.id;
                
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      if (tool.id === 'signature') {
                        handleOpenSignatureModal();
                      } else if (tool.id === 'image') {
                        handleTriggerImageUpload();
                      } else {
                        setActiveTool(tool.id);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1.5 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-50' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="text-xs font-bold">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          
          <div className="p-4 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3.5">Tool Configuration</span>

            
            {activeTool === 'select' && (
              <div className="space-y-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs leading-relaxed text-slate-500">
                <div className="flex items-center space-x-2 text-slate-700 font-bold mb-1">
                  <Info size={14} className="text-blue-500" />
                  <span>Interaction Mode</span>
                </div>
                <p>Click on any text, highlight, drawing, signature, or shape inside the document page to select it, resize, adjust color settings, or delete.</p>
                <p className="font-semibold text-slate-600">Tip: Click and draft or upload real content using the side buttons.</p>
              </div>
            )}

            
            {activeTool === 'draw' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-2">Brush Color</label>
                  <div className="flex flex-wrap gap-2">
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#0f172a'].map((col) => (
                      <button
                        key={col}
                        onClick={() => setDrawColor(col)}
                        className={`h-6 w-6 rounded-full border border-slate-200 transition-transform ${
                          drawColor === col ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Brush Thickness ({drawThickness}px)</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    value={drawThickness}
                    onChange={(e) => setDrawThickness(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleClearDrawings}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Eraser size={13} />
                    <span>Clear Draw Layers</span>
                  </button>
                </div>
              </div>
            )}

            
            {activeTool === 'shape' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-2">Vector Shape Type</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'rect', label: 'Rect', icon: Square },
                      { id: 'circle', label: 'Circle', icon: Circle },
                      { id: 'arrow', label: 'Arrow', icon: ArrowRight }
                    ].map((st) => {
                      const ShapeIcon = st.icon;
                      return (
                        <button
                          key={st.id}
                          onClick={() => setShapeType(st.id as any)}
                          className={`p-2 border rounded-lg text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            shapeType === st.id 
                              ? 'border-blue-500 bg-blue-50 text-blue-600 font-bold' 
                              : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                          }`}
                        >
                          <ShapeIcon size={14} />
                          <span className="text-[10px]">{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-2">Border Color</label>
                  <div className="flex gap-2">
                    {['#3b82f6', '#ef4444', '#10b981', '#0f172a'].map((col) => (
                      <button
                        key={col}
                        onClick={() => setDrawColor(col)}
                        className={`h-5 w-5 rounded-full ${
                          drawColor === col ? 'ring-2 ring-blue-500 scale-110' : ''
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            
            {activeTool === 'watermark' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Watermark Stamp Text</label>
                  <input 
                    type="text" 
                    value={watermarkTextInput}
                    onChange={(e) => setWatermarkTextInput(e.target.value)}
                    placeholder="CONFIDENTIAL"
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Rotation Angle ({watermarkRotation}&deg;)</label>
                  <input 
                    type="range" 
                    min="-90" 
                    max="90" 
                    value={watermarkRotation}
                    onChange={(e) => setWatermarkRotation(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={watermarkOpacity * 10}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value) / 10)}
                    className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <p className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 p-2 rounded leading-normal">
                  Click on the PDF canvas to stamp this customized background watermark.
                </p>
              </div>
            )}

            
            <div className="border-t border-slate-100 mt-6 pt-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Page Layout Modifiers</span>
              
              <button
                onClick={handleRotatePage}
                className="w-full py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RotateCw size={13} className="text-slate-400" />
                <span>Rotate Selected Page (90&deg;)</span>
              </button>

              <button
                onClick={handleCropPage}
                className={`w-full py-2 border text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activePage.isCropped 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Crop size={13} className={activePage.isCropped ? 'text-blue-500' : 'text-slate-400'} />
                <span>{activePage.isCropped ? 'Remove Crop Trimming' : 'Apply Crop Bounds'}</span>
              </button>
            </div>
          </div>

          
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400">
            <p className="leading-relaxed">All markup and annotations are processed within your secure, temporary client sandbox.</p>
          </div>
        </aside>
      </div>

      
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      
      
      
      {signatureModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-800">
                <PenTool size={18} className="text-blue-600" />
                <h3 className="font-display font-bold text-slate-900 text-sm">Create Verified Signature</h3>
              </div>
              <button 
                onClick={() => setSignatureModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            
            <div className="flex border-b border-slate-100 text-xs">
              <button
                onClick={() => setSignatureType('type')}
                className={`flex-1 py-3 font-bold transition-all ${
                  signatureType === 'type' 
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/10' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                Type Signature
              </button>
              <button
                onClick={() => setSignatureType('draw')}
                className={`flex-1 py-3 font-bold transition-all ${
                  signatureType === 'draw' 
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/10' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                Draw Signature
              </button>
            </div>

            
            <div className="p-6">
              
              
              {signatureType === 'type' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Type Your Name</label>
                    <input 
                      type="text"
                      value={sigTextInput}
                      onChange={(e) => setSigTextInput(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm bg-white font-medium"
                    />
                  </div>

                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Choose Handwriting Font</label>
                    <div className="grid grid-cols-2 gap-2">
                      {sigFonts.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSigTextFont(f.id)}
                          className={`p-3 border rounded-xl text-left transition-all ${
                            sigTextFont === f.id 
                              ? 'border-blue-500 bg-blue-50 text-blue-600' 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 block mb-1">{f.name}</span>
                          <span 
                            className="text-lg truncate block font-normal"
                            style={{ fontFamily: f.family }}
                          >
                            {sigTextInput || 'Signature'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              
              {signatureType === 'draw' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Use your cursor to sign below</label>
                    <button 
                      onClick={() => setSigPoints([])}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Clear Board
                    </button>
                  </div>

                  
                  <div className="border border-slate-200 rounded-xl bg-slate-50 aspect-[2/1] overflow-hidden relative">
                    <svg
                      ref={sigCanvasRef}
                      onMouseDown={handleSigDrawStart}
                      onMouseMove={handleSigDrawMove}
                      onMouseUp={handleSigDrawEnd}
                      className="w-full h-full cursor-pencil bg-white"
                    >
                      
                      {sigPoints.length > 1 && (
                        <path
                          d={`M ${sigPoints[0].x} ${sigPoints[0].y} ` + 
                             sigPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}
                          fill="none"
                          stroke={sigDrawColor}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                  </div>
                </div>
              )}

              
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Signature Ink Color</label>
                  <div className="flex space-x-2">
                    {['#0f172a', '#1d4ed8', '#15803d'].map((col) => (
                      <button
                        key={col}
                        onClick={() => setSigDrawColor(col)}
                        className={`h-5 w-5 rounded-full border border-slate-200 transition-transform ${
                          sigDrawColor === col ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setSignatureModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSignature}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    Create Sign Element
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      
      
      
      {saveStatus !== 'idle' && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 animate-in fade-in duration-200">
            
            
            {(saveStatus === 'saving' || saveStatus === 'downloading') && (
              <div className="space-y-6 py-6">
                <div className="relative flex justify-center items-center">
                  <div className="h-16 w-16 rounded-full border-4 border-blue-100 animate-pulse" />
                  <Loader2 size={32} className="text-blue-600 animate-spin absolute" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-bold text-slate-900 text-lg">
                    {saveStatus === 'saving' ? 'Saving Document Draft' : 'Compiling Output PDF'}
                  </h3>
                  <p className="text-sm text-slate-400">Please do not close this browser sandbox tab</p>
                </div>

                
                <div className="max-w-xs mx-auto">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${((savingStep + 1) / saveProgressSteps.length) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2.5 h-6 overflow-hidden">
                    <p className="text-xs font-bold text-blue-600 animate-pulse font-mono truncate">
                      {saveProgressSteps[savingStep]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            
            {saveStatus === 'success' && (
              <div className="space-y-6 py-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <Check size={26} className="stroke-[2.5]" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-bold text-slate-900 text-lg">Document Processed Successfully!</h3>
                  <p className="text-slate-500 text-xs px-2 leading-relaxed">
                    All visual annotations, signature markup stamps, and formatting layers have been integrated into your downloadable PDF stream.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Processed Metadata</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{fileName}</p>
                  <p className="text-[10px] text-slate-400">Total Pages: {pages.length} • Marked Elements: {pages.reduce((acc, p) => acc + p.elements.length + p.drawings.length, 0)}</p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setSaveStatus('idle');
                    }}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Keep Editing
                  </button>
                  <button
                    onClick={() => {
                      setSaveStatus('idle');
                      onBack();
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-100 transition-colors cursor-pointer"
                  >
                    Finish and Exit
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
