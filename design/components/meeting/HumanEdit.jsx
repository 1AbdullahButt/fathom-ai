import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function HumanEdit({editor,editedAt,children,showMark=true}){
  return <span style={{font:'400 16px/1.5 var(--font-serif)',color:'var(--human-text)'}}>
    {children}
    {showMark?<span title={'Written by '+editor+(editedAt?' · '+editedAt:'')} style={{display:'inline-flex',alignItems:'center',gap:3,marginLeft:6,verticalAlign:'1px',padding:'2px 5px',borderRadius:'var(--radius-xs)',background:'var(--human-soft)',color:'var(--human-mark)',font:'500 11px/1 var(--font-sans)',whiteSpace:'nowrap'}}><Icon name="pencil" size={10} strokeWidth={2.25}/>{editor}</span>:null}
  </span>;
}
