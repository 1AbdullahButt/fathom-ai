import * as React from 'react';
/** The supporting transcript quote shown under every AI claim; click jumps the player to it. */
export interface QuoteChipProps { speaker: string; color?: string; seconds: number; text: string; onJump?: (seconds: number) => void; active?: boolean; }
export declare function QuoteChip(props: QuoteChipProps): React.ReactElement | null;
