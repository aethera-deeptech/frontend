import type { SVGProps } from 'react';

// Drawn like the nav-plug icon in the Figma file. The stroke follows the text color of the parent.
export function PlugIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M9 3V8M15 3V8M12 18C15.3 18 18 15.3 18 12V8H6V12C6 15.3 8.7 18 12 18ZM12 18V21" />
    </svg>
  );
}
