import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS class names.
 * Used by shadcn/ui components.
 *
 * cn("px-2 py-1", condition && "bg-blue-500", "px-4")
 *   → resolves conflicts, deduplicates, returns clean class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
