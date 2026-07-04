import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { PDFTool } from '../types';
import LucideIcon from './LucideIcon';

interface ToolCardProps {
  tool: PDFTool;
  onClick: () => void;
  badge?: string;
}

export default function ToolCard({ tool, onClick, badge }: ToolCardProps) {
  const categoryStyles: Record<string, string> = {
    convert: 'text-blue-600 bg-blue-50/50 hover:border-blue-300',
    organize: 'text-sky-600 bg-sky-50/50 hover:border-sky-300',
    edit: 'text-emerald-600 bg-emerald-50/50 hover:border-emerald-300',
    security: 'text-violet-600 bg-violet-50/50 hover:border-violet-300',
    ai_ocr: 'text-amber-600 bg-amber-50/50 hover:border-amber-300',
  };

  const currentStyle = categoryStyles[tool.category] || 'text-slate-600 bg-slate-50 hover:border-slate-300';

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 cursor-pointer shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-300`}
      id={`tool-card-${tool.slug}`}
    >
      <div>
        
        <div className="flex items-center justify-between mb-4.5">
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg transition-all ${currentStyle}`}>
            <LucideIcon name={tool.icon} size={22} className="stroke-[2.2]" />
          </div>
          {badge && (
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>

        
        <h4 className="font-display text-base font-bold text-slate-800 mb-1.5 group-hover:text-blue-600 transition-colors">
          {tool.title}
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed font-normal mb-6">
          {tool.description}
        </p>
      </div>

      
      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
        <span>Try Tool</span>
        <ArrowRight size={13} className="transition-transform group-hover:translate-x-1 duration-200" />
      </div>
    </div>
  );
}
