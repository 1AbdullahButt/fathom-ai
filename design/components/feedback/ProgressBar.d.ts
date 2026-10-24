import * as React from 'react';
/** Thin determinate progress (upload, transcription). */
export interface ProgressBarProps { value?: number; tone?: "accent"|"warn"|"danger"; height?: number; label?: string; indeterminate?: boolean; }
export declare function ProgressBar(props: ProgressBarProps): React.ReactElement | null;
