/**
 * Utility functions for the Document Batch Generator
 */

import { CanvasField, ExcelRow } from '@/types';

/**
 * Resolves the display/export text for a single-column or static (custom word) field.
 * `row === null` means the editor skeleton (no preview data) — show the header/literal as a placeholder.
 * Combined fields are NOT handled here; they go through layoutCombined() in combinedLayout.ts.
 */
export const resolveFieldText = (field: CanvasField, row: ExcelRow | null): string => {
  if (field.isStatic) return field.headerName;
  if (!row) return field.headerName;
  const value = row[field.headerName];
  return value === undefined || value === null ? '' : String(value);
};

/**
 * Validates if a filename template is valid
 */
export const isValidFilenameTemplate = (template: string): boolean => {
  // Check for invalid characters in Windows/Unix filenames
  const invalidChars = /[<>:"/\\|?*]/g;
  
  // Remove template placeholders before checking
  const withoutPlaceholders = template.replace(/\{\{[^}]+\}\}/g, '');
  
  return !invalidChars.test(withoutPlaceholders);
};

/**
 * Sanitizes a filename by removing invalid characters
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200); // Limit length
};

/**
 * Formats file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <Args extends unknown[]>(
  func: (...args: Args) => unknown,
  wait: number
): ((...args: Args) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Generates a unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validates if a color string is valid hex
 */
export const isValidHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Extracts placeholders from a filename template
 */
export const extractPlaceholders = (template: string): string[] => {
  const matches = template.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  
  return matches.map(match => match.replace(/\{\{|\}\}/g, '').trim());
};

/**
 * Validates if all placeholders in template exist in headers
 */
export const validateTemplate = (template: string, headers: string[]): {
  valid: boolean;
  missingHeaders: string[];
} => {
  const placeholders = extractPlaceholders(template);
  const normalizedHeaders = headers.map((header) => header.trim());
  const missingHeaders = placeholders.filter(p => !normalizedHeaders.includes(p.trim()));
  
  return {
    valid: missingHeaders.length === 0,
    missingHeaders,
  };
};
