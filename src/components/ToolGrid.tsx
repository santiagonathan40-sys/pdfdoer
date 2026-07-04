import React from 'react';
import type { PDFTool } from '../types';
import ToolCard from './ToolCard';

interface ToolGridProps {
  tools: PDFTool[];
  onToolSelect: (slug: string) => void;
  limit?: number;
}

export default function ToolGrid({ tools, onToolSelect, limit }: ToolGridProps) {
  const displayedTools = limit ? tools.slice(0, limit) : tools;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="tool-grid">
      {displayedTools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          onClick={() => onToolSelect(tool.slug)}
        />
      ))}
    </div>
  );
}
