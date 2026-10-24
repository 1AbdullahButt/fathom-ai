import * as React from 'react';
/** Square/round icon-only control; always pass `label` (used as aria-label + tooltip). */
export interface IconButtonProps { icon: string; label: string; variant?: "ghost"|"secondary"|"player"|"playerPrimary"; size?: "sm"|"md"|"lg"|"xl"; active?: boolean; disabled?: boolean; round?: boolean; onClick?: (e: any) => void; style?: React.CSSProperties; }
export declare function IconButton(props: IconButtonProps): React.ReactElement | null;
