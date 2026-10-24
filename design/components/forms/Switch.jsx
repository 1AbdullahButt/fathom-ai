import React from 'react';
export function Switch({checked=false,onChange,label,disabled=false}){
  return <label style={{display:'inline-flex',alignItems:'center',gap:10,cursor:disabled?'default':'pointer',opacity:disabled?.5:1,font:'400 14px/1.4 var(--font-sans)',color:'var(--text-1)'}}>
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={()=>onChange&&onChange(!checked)} style={{width:34,height:20,borderRadius:999,border:0,padding:2,background:checked?'var(--accent)':'var(--paper-300)',cursor:'inherit',transition:'background var(--dur-2) var(--ease-out)',display:'inline-flex'}}>
      <span style={{width:16,height:16,borderRadius:'50%',background:'#fff',boxShadow:'var(--shadow-1)',transform:checked?'translateX(14px)':'none',transition:'transform var(--dur-2) var(--ease-out)'}}/>
    </button>
    {label?<span>{label}</span>:null}
  </label>;
}
