import * as React from 'react';
/** Compact exclusive switch for views/filters (Transcript / Chapters, All / Uploaded / Recorded). */
export interface SegmentedControlProps { options: (string|{value: string; label: string; icon?: string})[]; value: string; onChange?: (value: string) => void; size?: "sm"|"md"; fullWidth?: boolean; }
export declare function SegmentedControl(props: SegmentedControlProps): React.ReactElement | null;
