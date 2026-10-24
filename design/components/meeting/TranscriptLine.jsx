import React from 'react';
import { Timestamp } from './Timestamp.jsx';
function mark(text,q){if(!q)return text;const i=text.toLowerCase().indexOf(q.toLowerCase());if(i<0)return text;return [text.slice(0,i),<mark key="m" style={{background:'var(--amber-100)',color:'inherit',borderRadius:2,padding:'0 1px'}}>{text.slice(i,i+q.length)}</mark>,text.slice(i+q.length)];}
export function TranscriptLine({speaker,color,seconds=0,text,active=false,showSpeaker=true,onJump,query,inRange=false,tone='default'}){
  const dark=tone==='player';
  return <div data-t={seconds} style={{display:'grid',gridTemplateColumns:'60px minmax(0,1fr)',gap:12,padding:showSpeaker?'10px 12px 6px':'2px 12px 6px',borderRadius:'var(--radius-sm)',background:active?(dark?'rgba(255,255,255,.08)':'var(--surface-selected)'):inRange?'var(--paper-100)':'transparent',transition:'background var(--dur-2) var(--ease-out)'}}>
    <span style={{paddingTop:showSpeaker?20:3,textAlign:'right'}}><Timestamp seconds={seconds} active={active} onClick={onJump?()=>onJump(seconds):undefined} tone={tone}/></span>
    <div style={{minWidth:0}}>
      {showSpeaker?<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{width:7,height:7,borderRadius:'50%',background:color}}/><span style={{font:'600 13px/1.4 var(--font-sans)',color}}>{speaker}</span></div>:null}
      <p style={{margin:0,font:'400 15px/1.65 var(--font-sans)',color:dark?'var(--text-on-player)':active?'var(--ink-900)':'var(--ink-800)',textWrap:'pretty'}}>{mark(text,query)}</p>
    </div>
  </div>;
}
