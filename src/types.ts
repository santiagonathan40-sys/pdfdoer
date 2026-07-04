export type ToolCategory = 'convert' | 'organize' | 'edit' | 'security' | 'ai_ocr';

export type SubscriptionTier = 'guest' | 'free' | 'pro';

export interface User {
  email: string;
  tier: SubscriptionTier;
  createdAt: string;
}

export interface UsageStats {
  actionsCount: number;
  actionsLimit: number;
}

export interface PDFTool {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ToolCategory;
  icon: string;
  acceptedTypes: string;
  inputLabel: string;
  actionButtonText: string;
  apiEndpoint: string;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  downloadUrl: string;
  fileName: string;
  fileSize: string;
  timestamp: string;
}

