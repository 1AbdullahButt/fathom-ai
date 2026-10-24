import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Badge } from '../core/Badge.jsx';
import { AvatarStack } from '../core/AvatarStack.jsx';
import { ProgressBar } from '../feedback/ProgressBar.jsx';
import { Button } from '../core/Button.jsx';
import { formatTime } from './Timestamp.jsx';
function mark(text,q){if(!q)return text;const i=text.toLowerCase().indexOf(q.toLowerCase());if(i<0)return text;return [text.slice(0,i),<mark key="m" style={{background:'var(--amber-100)',color:'inherit',borderRadius:2}}>{text.slice(i,i+q.length)}</mark>,text.slice(i+q.length)];}
export function MeetingRow({title,date,duration,speakers=[],source='recording',media='video',status='ready',progress=0,snippet,query,onClick,onRetry,compact=false}){
  const [h,setH]=React.useState(false);const ready=status==='ready';
  return <div role="button" tabIndex={0} onClick={ready?onClick:undefined} onKeyDown={e=>{if(e.key==='Enter'&&ready&&onClick)onClick();}} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:'grid',gridTemplateColumns:compact?'36px minmax(0,1fr)':'40px minmax(0,1fr) auto',gap:compact?12:14,alignItems:'center',padding:compact?'12px':'14px 16px',borderRadius:'var(--radius-md)',background:h&&ready?'var(--surface-hover)':'transparent',cursor:ready?'pointer':'default',transition:'background var(--dur-1)'}}>
    <span style={{width:compact?36:40,height:compact?36:40,borderRadius:'var(--radius-sm)',background:status==='failed'?'var(--danger-soft)':'var(--paper-150)',color:status==='failed'?'var(--danger)':'var(--ink-600)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}><Icon name={status==='failed'?'circle-alert':media==='audio'?'audio-lines':'video'} size={18}/></span>
    <div style={{minWidth:0,display:'flex',flexDirection:'column',gap:4}}>
      <div style={{font:'600 15px/1.35 var(--font-sans)',color:ready?'var(--text-1)':'var(--text-2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{mark(title,query)}</div>
      <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'4px 8px',font:'400 13px/1.3 var(--font-sans)',color:'var(--text-muted)'}}>
        <span>{date}</span>{duration?<><span aria-hidden="true">·</span><span style={{fontFamily:'var(--font-mono)',fontSize:12}}>{formatTime(duration)}</span></>:null}
        <Badge size="sm" tone="outline" icon={source==='upload'?'upload':'mic'}>{source==='upload'?'Uploaded':'Recorded'}</Badge>
        {compact&&speakers.length?<span>{speakers.length} speakers</span>:null}
      </div>
      {status==='processing'?<div style={{display:'flex',alignItems:'center',gap:10,marginTop:4,maxWidth:360}}><ProgressBar value={progress}/><span style={{font:'500 12px/1 var(--font-sans)',color:'var(--accent)',whiteSpace:'nowrap'}}>Transcribing · {Math.round(progress)}%</span></div>:null}
      {status==='failed'?<div style={{display:'flex',alignItems:'center',gap:8,marginTop:2,font:'400 13px/1.4 var(--font-sans)',color:'var(--danger-text)'}}>We couldn’t read this file’s audio track.{onRetry?<Button size="sm" variant="ghost" icon="refresh-cw" onClick={e=>{e.stopPropagation();onRetry();}}>Retry</Button>:null}</div>:null}
      {snippet&&ready?<div style={{font:'400 13px/1.5 var(--font-sans)',color:'var(--ink-600)',marginTop:2,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{'\u2026'}{mark(snippet,query)}{'\u2026'}</div>:null}
    </div>
    {!compact?<AvatarStack people={speakers} max={4} ring={h&&ready?'var(--surface-hover)':'var(--surface-card)'}/>:null}
  </div>;
}
