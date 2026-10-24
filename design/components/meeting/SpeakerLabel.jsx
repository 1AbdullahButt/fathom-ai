import React from 'react';
export function SpeakerLabel({name,color='var(--ink-600)',role,size='md'}){
  return <span style={{display:'inline-flex',alignItems:'center',gap:6,minWidth:0}}>
    <span style={{width:size==='sm'?6:8,height:size==='sm'?6:8,borderRadius:'50%',background:color,flexShrink:0}}/>
    <span style={{font:'600 '+(size==='sm'?12:13)+'px/1.2 var(--font-sans)',color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
    {role?<span style={{font:'400 12px/1.2 var(--font-sans)',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{role}</span>:null}
  </span>;
}
