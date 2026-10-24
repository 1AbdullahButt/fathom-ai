import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Checkbox({checked=false,onChange,label,disabled=false,size=18}){
  return <label style={{display:'inline-flex',alignItems:'center',gap:8,cursor:disabled?'default':'pointer',opacity:disabled?.5:1,font:'400 14px/1.4 var(--font-sans)',color:'var(--text-1)'}}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={e=>onChange&&onChange(e.target.checked)} style={{position:'absolute',opacity:0,width:1,height:1}}/>
    <span aria-hidden="true" style={{width:size,height:size,flexShrink:0,borderRadius:5,border:'1.5px solid '+(checked?'var(--accent)':'var(--paper-300)'),background:checked?'var(--accent)':'var(--surface-card)',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'background var(--dur-1) var(--ease-out), border-color var(--dur-1)'}}>{checked?<Icon name="check" size={size-6} strokeWidth={3}/>:null}</span>
    {label?<span>{label}</span>:null}
  </label>;
}
