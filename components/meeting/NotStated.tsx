export interface NotStatedProps {
  /** What was not stated, e.g. "Owner" or "Date". */
  what: string;
}

/** Shown instead of an invented value when the meeting did not state one. */
export function NotStated({ what }: NotStatedProps) {
  return <span className="not-stated">{what} not stated</span>;
}

export default NotStated;
