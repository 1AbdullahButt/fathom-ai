import * as React from 'react';
/** Row in the meetings list: title, date, duration, source, participants; processing/failed states; search snippet. */
export interface MeetingRowProps { title: string; date: string; duration?: number; speakers?: {name: string; color?: string}[]; source?: "recording"|"upload"; media?: "video"|"audio"; status?: "ready"|"processing"|"failed"; progress?: number; snippet?: string; query?: string; onClick?: () => void; onRetry?: () => void; compact?: boolean; }
export declare function MeetingRow(props: MeetingRowProps): React.ReactElement | null;
