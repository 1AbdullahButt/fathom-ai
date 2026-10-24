import React from 'react';
import { Avatar } from './Avatar.jsx';
export function AvatarStack({people=[],max=4,size=24,ring='var(--surface-card)'}){
  const shown=people.slice(0,max);const extra=people.length-shown.length;
  return <span style={{display:'inline-flex',alignItems:'center'}} title={people.map(p=>p.name).join(', ')}>
    {shown.map((p,i)=><Avatar key={i} name={p.name} color={p.color} size={size} ring={ring} style={{marginLeft:i?-6:0}}/>)}
    {extra>0?<span style={{marginLeft:-6,height:size,minWidth:size,padding:'0 6px',borderRadius:999,background:'var(--paper-150)',color:'var(--ink-600)',boxShadow:'0 0 0 2px '+ring,display:'inline-flex',alignItems:'center',justifyContent:'center',font:'600 11px/1 var(--font-sans)'}}>+{extra}</span>:null}
  </span>;
}
