import type { SVGProps } from 'react';

// Drawn like the nav-home icon in the Figma file. The stroke follows the text color of the parent.
export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 11L12 3L21 11M5 10V20H19V10M10 20V14H14V20" />
    </svg>
  );
}
