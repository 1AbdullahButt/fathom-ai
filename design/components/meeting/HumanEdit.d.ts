import * as React from 'react';
/** Wraps human-written/edited text: Newsreader serif in pencil blue + author mark. */
export interface HumanEditProps { editor: string; editedAt?: string; children: React.ReactNode; showMark?: boolean; }
export declare function HumanEdit(props: HumanEditProps): React.ReactElement | null;
