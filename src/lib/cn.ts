import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The text style names come from the @theme block in index.css. Without them tailwind-merge reads text-h2 as a color
// and drops a text-text-2 class that sits next to it.
export const textStyles = ['kpi', 'h2', 'body', 'label', 'label-strong', 'button', 'tag', 'title'];

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: textStyles }] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
