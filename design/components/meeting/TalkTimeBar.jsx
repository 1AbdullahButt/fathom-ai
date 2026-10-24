import React from 'react';
import { Avatar } from '../core/Avatar.jsx';
export function TalkTimeBar({name,color,seconds=0,total=1,selected=false,dimmed=false,onToggle,speaking=false}){
  const [h,setH]=React.useState(false);const pct=total?seconds/total:0;
  return <button type="button" aria-pressed={selected} onClick={onToggle} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:'grid',gridTemplateColumns:'24px minmax(0,1fr) 64px',alignItems:'center',gap:10,width:'100%',padding:'6px 8px',border:'1px solid '+(selected?'var(--line-2)':'transparent'),borderRadius:'var(--radius-sm)',background:selected?'var(--surface-card)':h?'var(--surface-hover)':'transparent',boxShadow:selected?'var(--shadow-1)':'none',cursor:'pointer',textAlign:'left',opacity:dimmed?.45:1,transition:'opacity var(--dur-2), background var(--dur-1)'}}>
    <Avatar name={name} color={color} size={24} speaking={speaking}/>
    <span style={{display:'flex',flexDirection:'column',gap:5,minWidth:0}}>
      <span style={{font:'500 13px/1.2 var(--font-sans)',color:'var(--text-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
      <span style={{display:'block',height:4,borderRadius:2,background:'var(--paper-150)'}}><span style={{display:'block',height:'100%',width:Math.max(2,pct*100)+'%',background:color,borderRadius:2}}/></span>
    </span>
    <span style={{textAlign:'right',font:'400 12px/1.2 var(--font-mono)',color:'var(--text-muted)',fontVariantNumeric:'tabular-nums'}}>{Math.round(seconds/60)}m <span style={{color:'var(--text-disabled)'}}>{Math.round(pct*100)}%</span></span>
  </button>;
}
