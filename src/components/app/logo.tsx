/**
 * The StudentOS mark: a smooth glass disc with two overlapping frosted rings, people coming together. No letters, so it reads
 * in any language and at any size. One drawing, used on the site, in the app header and (rendered to PNG) for the app icons.
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
        <linearGradient id="sos-body" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#7b72f2" />
          <stop offset="1" stopColor="#2a2486" />
        </linearGradient>
        <radialGradient id="sos-lift" cx="50%" cy="0%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sos-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id="sos-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff" stopOpacity=".35" />
        </linearGradient>
        <linearGradient id="sos-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
        </linearGradient>
        <clipPath id="sos-clip">
          <circle cx="50" cy="50" r="48" />
        </clipPath>
        <clipPath id="sos-lens">
          <circle cx="39" cy="50" r="19" />
        </clipPath>
        <filter id="sos-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="1.6"
            stdDeviation="1.6"
            floodColor="#120d4a"
            floodOpacity=".45"
          />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#sos-body)" />
      <g clipPath="url(#sos-clip)">
        <rect width="100" height="100" fill="url(#sos-lift)" />
      </g>
      <g filter="url(#sos-soft)">
        <circle
          cx="39"
          cy="50"
          r="19"
          fill="url(#sos-fill)"
          stroke="url(#sos-edge)"
          strokeWidth="2.2"
        />
        <circle
          cx="61"
          cy="50"
          r="19"
          fill="url(#sos-fill)"
          stroke="url(#sos-edge)"
          strokeWidth="2.2"
        />
      </g>
      <g clipPath="url(#sos-lens)">
        <circle cx="61" cy="50" r="19" fill="#fff" fillOpacity="0.16" />
      </g>
      <circle cx="50" cy="50" r="47.4" fill="none" stroke="url(#sos-rim)" strokeWidth="1" />
    </svg>
  );
}
