import * as React from 'react';
/** Native-select dropdown with inline label — e.g. the summary template switcher. */
export interface SelectProps { value: string; options: (string|{value: string; label: string})[]; onChange?: (value: string) => void; label?: string; icon?: string; size?: "sm"|"md"; disabled?: boolean; style?: React.CSSProperties; }
export declare function Select(props: SelectProps): React.ReactElement | null;
