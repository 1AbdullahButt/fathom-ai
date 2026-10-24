import * as React from 'react';
/** Action item with checkbox, owner, due date (or "not stated"), confidence and supporting quote. */
export interface ActionItemProps { text: React.ReactNode; owner?: {name: string; color?: string} | null; due?: string | null; done?: boolean; onToggle?: (checked: boolean) => void; confidence?: "high"|"low"; lowReason?: string; edited?: {by: string; at?: string}; quote?: {speaker: string; color?: string; seconds: number; text: string}; onJump?: (seconds: number) => void; active?: boolean; }
export declare function ActionItem(props: ActionItemProps): React.ReactElement | null;
