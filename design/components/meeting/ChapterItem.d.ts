import * as React from 'react';
/** Chapter row for long-meeting navigation; active row shows chapter progress. */
export interface ChapterItemProps { index: number; title: string; seconds: number; duration?: number; active?: boolean; progress?: number; onClick?: (seconds: number) => void; }
export declare function ChapterItem(props: ChapterItemProps): React.ReactElement | null;
