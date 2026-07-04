import React from 'react';
import * as icons from 'lucide-react';

interface LucideIconProps {
  name: string;
  className?: string;
  size?: number;
}

export default function LucideIcon({ name, className = '', size = 24 }: LucideIconProps) {
  const IconComponent = (icons as any)[name] || icons.File;
  return <IconComponent className={className} size={size} />;
}
