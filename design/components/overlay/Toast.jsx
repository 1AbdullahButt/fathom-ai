import React from 'react';
import { Icon } from '../core/Icon.jsx';
const T={success:['check','var(--tide-200)'],error:['circle-alert','#F0A897'],info:['info','var(--night-300)'],link:['link','var(--tide-200)']};
export function Toast({tone='success',title,body,actionLabel,onAction,onClose}){
  const [ic,c]=T[tone]||T.info;
  return <div role="status" style={{display:'flex',alignItems:'flex-start',gap:10,width:'100%',maxWidth:380,padding:'12px 12px 12px 14px',borderRadius:'var(--radius-md)',background:'var(--ink-900)',color:'var(--paper-50)',boxShadow:'var(--shadow-3)',animation:'sotto-fade-up var(--dur-3) var(--ease-out)'}}>
    <span style={{color:c,paddingTop:1}}><Icon name={ic} size={18} strokeWidth={2}/></span>
    <div style={{flex:1,minWidth:0}}>
      <div style={{font:'500 14px/1.4 var(--font-sans)'}}>{title}</div>
      {body?<div style={{font:'400 13px/1.45 var(--font-sans)',color:'var(--night-300)',marginTop:2}}>{body}</div>:null}
    </div>
    {actionLabel?<button type="button" onClick={onAction} style={{background:'none',border:0,color:'var(--tide-200)',font:'600 13px/1.4 var(--font-sans)',cursor:'pointer',padding:'0 4px'}}>{actionLabel}</button>:null}
    {onClose?<button type="button" aria-label="Dismiss" onClick={onClose} style={{background:'none',border:0,color:'var(--night-300)',cursor:'pointer',padding:0}}><Icon name="x" size={16}/></button>:null}
  </div>;
}
