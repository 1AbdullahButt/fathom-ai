import * as React from 'react';
/** Text field; with icon="search" it is the meetings/transcript search. */
export interface InputProps { value?: string; onChange?: (e: any) => void; placeholder?: string; icon?: string; size?: "sm"|"md"|"lg"; shortcut?: string; onClear?: () => void; disabled?: boolean; autoFocus?: boolean; type?: string; style?: React.CSSProperties; inputStyle?: React.CSSProperties; }
export declare function Input(props: InputProps): React.ReactElement | null;
