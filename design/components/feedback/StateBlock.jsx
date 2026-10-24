import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Spinner } from './Spinner.jsx';
const K={empty:['inbox','var(--paper-150)','var(--ink-500)'],noResults:['search','var(--paper-150)','var(--ink-500)'],error:['circle-alert','var(--danger-soft)','var(--danger)'],offline:['wifi-off','var(--danger-soft)','var(--danger)'],notFound:['link','var(--paper-150)','var(--ink-500)'],locked:['lock','var(--paper-150)','var(--ink-500)'],processing:['audio-lines','var(--accent-soft)','var(--accent)']};
export function StateBlock({kind='empty',icon,title,body,actions,compact=false,loading=false}){
  const [ic,bg,fg]=K[kind]||K.empty;const d=compact?36:48;
  return <div role={kind==='error'||kind==='offline'?'alert':undefined} style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:compact?8:12,padding:compact?'24px 16px':'48px 24px',maxWidth:420,margin:'0 auto'}}>
    <span style={{width:d,height:d,borderRadius:'50%',background:bg,color:fg,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{loading?<Spinner size={compact?18:22}/>:<Icon name={icon||ic} size={compact?18:22}/>}</span>
    {title?<div style={{font:'600 '+(compact?14:16)+'px/1.35 var(--font-sans)',color:'var(--text-1)',textWrap:'balance'}}>{title}</div>:null}
    {body?<div style={{font:'400 '+(compact?13:14)+'px/1.55 var(--font-sans)',color:'var(--text-muted)',textWrap:'pretty'}}>{body}</div>:null}
    {actions?<div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginTop:4}}>{actions}</div>:null}
  </div>;
}
