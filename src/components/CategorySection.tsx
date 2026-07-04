import React from 'react';
import { CATEGORIES } from '../data/tools';
import type { PDFTool, ToolCategory } from '../types';
import ToolGrid from './ToolGrid';

interface CategorySectionProps {
  categoryKey: ToolCategory;
  tools: PDFTool[];
  onToolSelect: (slug: string) => void;
}

export default function CategorySection({ categoryKey, tools, onToolSelect }: CategorySectionProps) {
  const info = CATEGORIES[categoryKey];
  if (!info) return null;

  return (
    <section className="mb-14 scroll-mt-24" id={`category-sec-${categoryKey}`}>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-7 pb-4.5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-display text-lg font-bold text-slate-800">
              {info.title}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {info.description}
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 self-start md:self-auto">
          {tools.length} Tools Available
        </span>
      </div>

      
      <ToolGrid tools={tools} onToolSelect={onToolSelect} />
    </section>
  );
}
