import * as React from 'react';
/** One transcript utterance: clickable timestamp, speaker, text; highlights the active line and search matches. */
export interface TranscriptLineProps { speaker: string; color?: string; seconds: number; text: string; active?: boolean; showSpeaker?: boolean; onJump?: (seconds: number) => void; query?: string; inRange?: boolean; tone?: "default"|"player"; }
export declare function TranscriptLine(props: TranscriptLineProps): React.ReactElement | null;
