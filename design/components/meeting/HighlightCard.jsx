import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { IconButton } from '../core/IconButton.jsx';
import { Avatar } from '../core/Avatar.jsx';
import { formatTime } from './Timestamp.jsx';
export function HighlightCard({title,start=0,end=0,speaker,color,text,author,onPlay,onShare,active=false}){
  const [h,setH]=React.useState(false);
  return <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:'flex',flexDirection:'column',gap:8,padding:12,borderRadius:'var(--radius-md)',border:'1px solid '+(active?'var(--tide-200)':'var(--line-1)'),background:active?'var(--accent-soft)':'var(--surface-card)',boxShadow:h?'var(--shadow-2)':'var(--shadow-1)',transition:'box-shadow var(--dur-2) var(--ease-out)'}}>
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <button type="button" onClick={()=>onPlay&&onPlay(start)} style={{display:'inline-flex',alignItems:'center',gap:6,height:24,padding:'0 8px',border:0,borderRadius:'var(--radius-xs)',background:'var(--ink-900)',color:'var(--paper-50)',font:'400 12px/1 var(--font-mono)',cursor:'pointer'}}><Icon name="play" size={11} strokeWidth={2.25}/>{formatTime(start)}–{formatTime(end)}</button>
      <span style={{font:'400 12px/1 var(--font-sans)',color:'var(--text-muted)'}}>{Math.max(1,Math.round(end-start))}s</span>
      <span style={{flex:1}}/>
      {onShare?<IconButton icon="link" label="Copy public clip link" size="sm" onClick={onShare}/>:null}
    </div>
    <div style={{font:'600 14px/1.4 var(--font-sans)',color:'var(--text-1)'}}>{title}</div>
    {text?<div style={{font:'400 13px/1.5 var(--font-sans)',color:'var(--ink-700)'}}><span style={{color,fontWeight:600}}>{speaker}: </span>{'\u201C'+text+'\u201D'}</div>:null}
    {author?<div style={{display:'flex',alignItems:'center',gap:6,font:'400 12px/1 var(--font-sans)',color:'var(--text-muted)'}}><Avatar name={author} size={18}/>Clipped by {author}</div>:null}
  </div>;
}
