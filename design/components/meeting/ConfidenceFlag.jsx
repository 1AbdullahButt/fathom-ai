import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function ConfidenceFlag({reason,label='Low confidence',compact=false}){
  return <span title={reason} style={{display:'inline-flex',alignItems:'center',gap:4,height:22,padding:'0 7px',borderRadius:'var(--radius-xs)',background:'var(--warn-soft)',color:'var(--warn-text)',font:'500 12px/1 var(--font-sans)',whiteSpace:'nowrap'}}>
    <Icon name="triangle-alert" size={12} strokeWidth={2}/>{compact?null:label}{reason&&!compact?<span style={{fontWeight:400,color:'var(--amber-700)',opacity:.85}}>· {reason}</span>:null}
  </span>;
}
