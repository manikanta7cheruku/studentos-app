/**
 * The StudentOS mark: a glass sphere with a soft light on top and a white "S" ribbon. One drawing, used on the site, in the
 * app header and (rendered to PNG) for the app icons, so they always match. The same artwork is in public/logo.svg.
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="sos-body" cx="36%" cy="28%" r="85%">
          <stop offset="0" stopColor="#a69dff" />
          <stop offset="0.45" stopColor="#6258dc" />
          <stop offset="1" stopColor="#241e6b" />
        </radialGradient>
        <linearGradient id="sos-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.62" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sos-glow" cx="50%" cy="100%" r="70%">
          <stop offset="0" stopColor="#c9b8ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#c9b8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sos-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
        </linearGradient>
        <clipPath id="sos-clip">
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#sos-body)" />
      <g clipPath="url(#sos-clip)">
        <ellipse cx="50" cy="102" rx="46" ry="34" fill="url(#sos-glow)" />
        <ellipse
          cx="42"
          cy="22"
          rx="31"
          ry="17"
          fill="url(#sos-sheen)"
          transform="rotate(-14 42 22)"
        />
      </g>
      <circle cx="50" cy="50" r="47.2" fill="none" stroke="url(#sos-rim)" strokeWidth="1.6" />
      <path
        d="M65 36.5C65 29 57 26 50 26C42 26 35 30 35 37C35 44.500 42 46.500 50 49C58 51.500 66 54 66 62C66 69 58.500 73 50 73C41 73 34 69.500 34 62.500"
        fill="none"
        stroke="#fff"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
