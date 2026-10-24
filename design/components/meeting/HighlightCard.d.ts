import * as React from 'react';
/** Saved highlight / clip with time range, quote and share-link action. */
export interface HighlightCardProps { title: string; start: number; end: number; speaker?: string; color?: string; text?: string; author?: string; onPlay?: (seconds: number) => void; onShare?: () => void; active?: boolean; }
export declare function HighlightCard(props: HighlightCardProps): React.ReactElement | null;
