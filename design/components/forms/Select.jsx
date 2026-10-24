import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Select({value,options=[],onChange,label,icon,size='md',disabled=false,style}){
  const h=size==='sm'?28:36;const opts=options.map(o=>typeof o==='string'?{value:o,label:o}:o);
  return <label style={{position:'relative',display:'inline-flex',alignItems:'center',gap:6,height:h,padding:'0 30px 0 10px',borderRadius:'var(--radius-sm)',background:'var(--surface-card)',border:'1px solid var(--line-2)',boxShadow:'var(--shadow-1)',font:'500 '+(size==='sm'?13:14)+'px/1 var(--font-sans)',color:'var(--text-1)',cursor:'pointer',opacity:disabled?.5:1,...style}}>
    {icon?<Icon name={icon} size={16} color="var(--text-muted)"/>:null}
    {label?<span style={{color:'var(--text-muted)',fontWeight:400}}>{label}</span>:null}
    <span>{(opts.find(o=>o.value===value)||opts[0]||{}).label}</span>
    <select value={value} disabled={disabled} onChange={e=>onChange&&onChange(e.target.value)} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',font:'inherit'}}>
      {opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'var(--text-muted)'}}><Icon name="chevron-down" size={15}/></span>
  </label>;
}
