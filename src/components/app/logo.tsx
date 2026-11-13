/**
 * The StudentOS mark: a glass sphere with two overlapping glass rings, people coming together. No letters, so it reads in any
 * language and at any size. One drawing, used on the site, in the app header and (rendered to PNG) for the app icons.
 * The same artwork is in public/logo.svg.
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
          <stop offset="1" stopColor="#1f1a5e" />
        </radialGradient>
        <linearGradient id="sos-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sos-glow" cx="50%" cy="100%" r="70%">
          <stop offset="0" stopColor="#c9b8ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#c9b8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sos-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="sos-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#d9d2ff" stopOpacity="0.55" />
        </linearGradient>
        <clipPath id="sos-clip">
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#sos-body)" />
      <g clipPath="url(#sos-clip)">
        <ellipse cx="50" cy="104" rx="46" ry="34" fill="url(#sos-glow)" />
      </g>
      <circle
        cx="39"
        cy="50"
        r="19"
        fill="#fff"
        fillOpacity="0.14"
        stroke="url(#sos-line)"
        strokeWidth="3.6"
      />
      <circle
        cx="61"
        cy="50"
        r="19"
        fill="#fff"
        fillOpacity="0.14"
        stroke="url(#sos-line)"
        strokeWidth="3.6"
      />
      <g clipPath="url(#sos-clip)">
        <ellipse
          cx="42"
          cy="20"
          rx="31"
          ry="15"
          fill="url(#sos-sheen)"
          transform="rotate(-14 42 20)"
        />
      </g>
      <circle cx="50" cy="50" r="47.2" fill="none" stroke="url(#sos-rim)" strokeWidth="1.6" />
    </svg>
  );
}
