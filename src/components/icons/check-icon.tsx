import type { SVGProps } from 'react';

// Drawn like the check icon in the Figma file. The stroke follows the text color of the parent.
export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 8.5L6.5 12L13 4.5" />
    </svg>
  );
}
