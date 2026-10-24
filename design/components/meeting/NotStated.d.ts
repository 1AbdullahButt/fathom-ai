import * as React from 'react';
/** Dashed placeholder used when an owner or due date was not said in the meeting — never guess. */
export interface NotStatedProps { kind?: "owner"|"date"|"other"; label?: string; }
export declare function NotStated(props: NotStatedProps): React.ReactElement | null;
