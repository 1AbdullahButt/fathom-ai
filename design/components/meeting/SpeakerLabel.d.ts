import * as React from 'react';
/** Speaker colour dot + name (+ optional role). */
export interface SpeakerLabelProps { name: string; color?: string; role?: string; size?: "sm"|"md"; }
export declare function SpeakerLabel(props: SpeakerLabelProps): React.ReactElement | null;
