import * as React from 'react';
/** Amber flag marking an AI item the model is unsure about. */
export interface ConfidenceFlagProps { reason?: string; label?: string; compact?: boolean; }
export declare function ConfidenceFlag(props: ConfidenceFlagProps): React.ReactElement | null;
