import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function NotStated({kind='owner',label}){
  const ic=kind==='date'?'calendar':kind==='owner'?'user':'circle-help';
  return <span title={(kind==='date'?'No due date':'No owner')+' was said in the meeting'} style={{display:'inline-flex',alignItems:'center',gap:5,height:22,padding:'0 7px',borderRadius:'var(--radius-xs)',border:'1px dashed var(--paper-300)',color:'var(--text-muted)',font:'italic 400 12px/1 var(--font-sans)',whiteSpace:'nowrap'}}>
    <Icon name={ic} size={12}/>{label||'not stated'}
  </span>;
}
