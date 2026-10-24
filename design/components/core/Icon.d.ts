import * as React from 'react';
/** Lucide-derived line icon (65 glyphs, see ICONS). Use for every UI glyph. */
export interface IconProps { name: string; size?: number; strokeWidth?: number; color?: string; title?: string; style?: React.CSSProperties; }
export declare function Icon(props: IconProps): React.ReactElement | null;
export declare const ICONS: Record<string, string>;
