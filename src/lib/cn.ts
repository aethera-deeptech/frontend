import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The text style names come from the @theme block in index.css. Without them tailwind-merge reads text-h2 as a color
// and drops a text-text-2 class that sits next to it.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['kpi', 'h2', 'body', 'label', 'label-strong', 'button', 'tag', 'title'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
