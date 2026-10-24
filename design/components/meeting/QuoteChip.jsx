import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { formatTime } from './Timestamp.jsx';
export function QuoteChip({speaker,color='var(--ink-600)',seconds=0,text,onJump,active=false}){
  const [h,setH]=React.useState(false);
  return <button type="button" onClick={()=>onJump&&onJump(seconds)} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} aria-label={'Play quote from '+speaker+' at '+formatTime(seconds)}
    style={{display:'flex',flexDirection:'column',gap:6,width:'100%',textAlign:'left',padding:'8px 10px',border:'1px solid '+(active?'var(--tide-200)':'transparent'),borderRadius:'var(--radius-sm)',background:active?'var(--accent-soft)':h?'var(--paper-150)':'var(--quote-bg)',cursor:'pointer',transition:'background var(--dur-1) var(--ease-out)'}}>
    <span style={{font:'400 13px/1.5 var(--font-sans)',color:'var(--ink-700)',textWrap:'pretty'}}>{'\u201C'+text+'\u201D'}</span>
    <span style={{display:'flex',alignItems:'center',gap:6,font:'500 12px/1 var(--font-sans)',color:'var(--text-muted)'}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:color}}/>
      <span style={{color:'var(--ink-600)'}}>{speaker}</span>
      <span aria-hidden="true">·</span>
      <span style={{display:'inline-flex',alignItems:'center',gap:4,color:h||active?'var(--accent)':'var(--text-muted)',font:'400 12px/1 var(--font-mono)'}}><Icon name="play" size={11} strokeWidth={2.25}/>{formatTime(seconds)}</span>
    </span>
  </button>;
}
