import type { ProcessingResult } from '../types';
import { getAuthToken } from './authApi';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function getOrCreateDeviceId() {
  const storageKey = 'pdfdoer_device_id';
  const existingId = localStorage.getItem(storageKey);

  if (existingId) {
    return existingId;
  }

  const newId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(storageKey, newId);

  return newId;
}

export async function processPdfTool(
  toolSlug: string,
  file: File | File[],
  options: Record<string, any> = {}
): Promise<ProcessingResult> {
  const files = Array.isArray(file) ? file : [file];

  if (!files.length) {
    throw new Error('No input file provided');
  }

  const formData = new FormData();

  files.forEach((f) => {
    formData.append('files', f);
  });

  formData.append('options', JSON.stringify(options));

  const token = getAuthToken();
  const deviceId = getOrCreateDeviceId();

  const headers: Record<string, string> = {
    'X-PDFDoer-Device-ID': deviceId,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/pdf/${toolSlug}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to process file');
  }

  return data;
}