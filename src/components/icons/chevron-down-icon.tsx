import type { SVGProps } from 'react';

// Drawn like the chevron-down icon in the Figma file. The stroke follows the text color of the parent.
export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M3 6L8 11L13 6" />
    </svg>
  );
}
