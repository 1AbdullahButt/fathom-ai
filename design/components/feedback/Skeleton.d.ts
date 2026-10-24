import * as React from 'react';
/** Shimmer placeholder for loading layouts — mirror the real layout's shape. */
export interface SkeletonProps { width?: number|string; height?: number; radius?: string; lines?: number; gap?: number; style?: React.CSSProperties; }
export declare function Skeleton(props: SkeletonProps): React.ReactElement | null;
