import * as React from 'react';
/** Mono time label; clickable when onClick is given (jumps the player). Also exports formatTime(). */
export interface TimestampProps { seconds: number; end?: number; onClick?: () => void; active?: boolean; tone?: "default"|"player"; style?: React.CSSProperties; }
export declare function Timestamp(props: TimestampProps): React.ReactElement | null;
export declare function formatTime(seconds: number): string;
