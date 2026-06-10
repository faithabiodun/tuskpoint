// TuskPoint mark: a stylized walrus tusk arc + a checkpoint "pin" node.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden
      role="img"
    >
      <defs>
        <linearGradient id="tp-grad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="55%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#0f1626" />
      <rect
        width="31"
        height="31"
        x="0.5"
        y="0.5"
        rx="7.5"
        stroke="url(#tp-grad)"
        strokeOpacity="0.4"
      />
      {/* Tusk arc */}
      <path
        d="M9 8c0 8 2 12 8 16"
        stroke="url(#tp-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M22 9c0 7-1.5 11-5 14"
        stroke="url(#tp-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      {/* Checkpoint node */}
      <circle cx="17" cy="24" r="3" fill="url(#tp-grad)" />
      <circle cx="17" cy="24" r="3" stroke="#0f1626" strokeWidth="1" />
    </svg>
  );
}
