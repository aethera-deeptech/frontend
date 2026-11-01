import type { SVGProps } from 'react';

// Drawn like the nav-bulb icon in the Figma file. The stroke follows the text color of the parent.
export function BulbIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M10 21H14M9 18H15V16.5C15 15.7 15.2 15 16 14.2C17.2 13 18.5 11.6 18.5 9.2C18.5 6 16 3 12 3C8 3 5.5 6 5.5 9.2C5.5 11.6 6.8 13 8 14.2C8.8 15 9 15.7 9 16.5V18Z" />
    </svg>
  );
}
