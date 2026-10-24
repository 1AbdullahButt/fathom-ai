import * as React from 'react';
/** One summary bullet: text (AI or human), optional low-confidence flag, and its QuoteChip. */
export interface SummaryPointProps { text: React.ReactNode; edited?: {by: string; at?: string}; confidence?: "high"|"low"; lowReason?: string; quote?: {speaker: string; color?: string; seconds: number; text: string}; onJump?: (seconds: number) => void; active?: boolean; onEdit?: () => void; }
export declare function SummaryPoint(props: SummaryPointProps): React.ReactElement | null;
