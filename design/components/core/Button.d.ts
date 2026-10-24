import * as React from 'react';
/** Text button for primary/secondary actions; Record and Upload always render as an equal pair. */
export interface ButtonProps { variant?: "primary"|"secondary"|"ghost"|"danger"|"player"; size?: "sm"|"md"|"lg"; icon?: string; iconRight?: string; iconColor?: string; loading?: boolean; disabled?: boolean; fullWidth?: boolean; type?: "button"|"submit"; children?: React.ReactNode; onClick?: (e: any) => void; style?: React.CSSProperties; }
export declare function Button(props: ButtonProps): React.ReactElement | null;
