import * as React from 'react';
/** Night-surface scrubber + transport (±10s, play, speed) with chapter ticks and optional clip range. */
export interface PlayerControlsProps { playing?: boolean; current: number; duration: number; onToggle?: () => void; onSeek?: (seconds: number) => void; rate?: number; onRate?: () => void; chapters?: {title: string; seconds: number}[]; range?: [number, number]; compact?: boolean; onFullscreen?: () => void; }
export declare function PlayerControls(props: PlayerControlsProps): React.ReactElement | null;
