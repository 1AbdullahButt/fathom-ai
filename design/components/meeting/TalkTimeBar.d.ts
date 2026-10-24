import * as React from 'react';
/** Speaker filter row with talk-time bar; toggling filters the transcript to that speaker. */
export interface TalkTimeBarProps { name: string; color: string; seconds: number; total: number; selected?: boolean; dimmed?: boolean; speaking?: boolean; onToggle?: () => void; }
export declare function TalkTimeBar(props: TalkTimeBarProps): React.ReactElement | null;
