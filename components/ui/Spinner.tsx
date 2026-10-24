export interface SpinnerProps {
  size?: number;
  color?: string;
  /** When set, the spinner is announced as a status with this name. */
  label?: string;
}

export function Spinner({ size = 18, color = "var(--accent)", label }: SpinnerProps) {
  return (
    <svg
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      style={{ animation: "sotto-spin .9s linear infinite", flexShrink: 0, display: "block" }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default Spinner;
