import Link from "next/link";

/**
 * The TuskPoint tusk mark — a curved ivory tusk resolving into a glowing
 * checkpoint at its tip. Rendered inline so it scales crisply and gets a
 * unique gradient-id prefix per instance (avoids clashes when used twice).
 */
export function LogoMark({
  className = "h-8 w-8",
  idPrefix = "lm",
}: {
  className?: string;
  idPrefix?: string;
}) {
  const halo = `${idPrefix}-halo`;
  const ivory = `${idPrefix}-ivory`;
  const sheen = `${idPrefix}-sheen`;
  const core = `${idPrefix}-core`;
  const trail = `${idPrefix}-trail`;
  return (
    <svg
      viewBox="0 0 680 540"
      className={className}
      role="img"
      aria-label="TuskPoint"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={halo} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#48ddca" stopOpacity="0.5" />
          <stop offset="45%" stopColor="#0fb3a1" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0fb3a1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ivory} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdfaf2" />
          <stop offset="40%" stopColor="#e6dcc6" />
          <stop offset="78%" stopColor="#bcae8e" />
          <stop offset="100%" stopColor="#8a7a56" />
        </linearGradient>
        <linearGradient id={sheen} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={core} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#d4f7f1" />
          <stop offset="65%" stopColor="#2fd4c0" />
          <stop offset="100%" stopColor="#0fb3a1" />
        </radialGradient>
        <linearGradient id={trail} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#48ddca" stopOpacity="0" />
          <stop offset="100%" stopColor="#48ddca" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <circle cx="430" cy="330" r="200" fill={`url(#${halo})`} />

      <g transform="translate(340,270)">
        <ellipse cx="-40" cy="120" rx="150" ry="26" fill="#000000" opacity="0.18" />
        <path
          d="M -185 -30 C -150 -95, 30 -110, 120 -38 C 165 -2, 178 38, 184 66"
          fill="none"
          stroke={`url(#${ivory})`}
          strokeWidth="30"
          strokeLinecap="round"
        />
        <path
          d="M -185 -30 C -150 -95, 30 -110, 120 -38 C 165 -2, 178 38, 184 66"
          fill="none"
          stroke={`url(#${sheen})`}
          strokeWidth="11"
          strokeLinecap="round"
          transform="translate(-2,-5)"
        />
        <path
          d="M -150 -55 C -90 -88, 30 -92, 90 -52"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <g opacity="0.85">
          <circle cx="-120" cy="-58" r="3" fill="#48ddca" />
          <circle cx="-40" cy="-78" r="3.4" fill="#48ddca" />
          <circle cx="55" cy="-62" r="3.8" fill="#48ddca" />
          <circle cx="125" cy="-22" r="4.4" fill="#48ddca" />
        </g>
        <path
          d="M 90 -50 C 130 -14, 162 24, 184 66"
          fill="none"
          stroke={`url(#${trail})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="2 7"
        />
        <circle cx="184" cy="66" r="46" fill={`url(#${halo})`} />
        <circle cx="184" cy="66" r="22" fill="#0fb3a1" opacity="0.25" />
        <circle cx="184" cy="66" r="13" fill={`url(#${core})`} />
        <circle cx="180" cy="61" r="3.5" fill="#ffffff" opacity="0.95" />
        <g stroke="#48ddca" strokeWidth="2" strokeLinecap="round" opacity="0.7">
          <line x1="184" y1="38" x2="184" y2="28" />
          <line x1="184" y1="94" x2="184" y2="104" />
          <line x1="212" y1="66" x2="222" y2="66" />
          <line x1="156" y1="66" x2="146" y2="66" />
          <line x1="204" y1="46" x2="211" y2="39" />
          <line x1="164" y1="86" x2="157" y2="93" />
        </g>
      </g>
    </svg>
  );
}

/** Mark + wordmark, links home. Used in the header and footer. */
export function Logo({
  className = "",
  markClassName = "h-9 w-9",
  idPrefix = "lm",
  wordmark = true,
}: {
  className?: string;
  markClassName?: string;
  idPrefix?: string;
  wordmark?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="TuskPoint home"
    >
      <LogoMark className={markClassName} idPrefix={idPrefix} />
      {wordmark && (
        <span className="text-lg font-extrabold tracking-tight text-cream">
          Tusk<span className="text-flame">Point</span>
        </span>
      )}
    </Link>
  );
}
