import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Input({value,onChange,placeholder,icon,size='md',shortcut,onClear,disabled=false,autoFocus,type='text',style,inputStyle,...rest}){
  const [f,setF]=React.useState(false);const h=size==='lg'?44:size==='sm'?30:36;
  return <label style={{display:'flex',alignItems:'center',gap:8,height:h,padding:'0 10px',borderRadius:'var(--radius-sm)',background:'var(--surface-card)',border:'1px solid '+(f?'var(--line-focus)':'var(--line-2)'),boxShadow:f?'var(--ring-focus)':'var(--shadow-1)',transition:'border-color var(--dur-1), box-shadow var(--dur-1)',opacity:disabled?.5:1,cursor:'text',...style}}>
    {icon?<Icon name={icon} size={17} color="var(--text-muted)"/>:null}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{flex:1,minWidth:0,border:0,outline:'none',background:'transparent',color:'var(--text-1)',font:'400 '+(size==='lg'?15:14)+'px/1 var(--font-sans)',...inputStyle}} {...rest}/>
    {onClear&&value?<button type="button" aria-label="Clear" onClick={onClear} style={{border:0,background:'var(--paper-150)',borderRadius:999,width:20,height:20,display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--ink-600)',padding:0}}><Icon name="x" size={13} strokeWidth={2}/></button>:null}
    {shortcut&&!value?<kbd style={{font:'500 11px/1 var(--font-mono)',color:'var(--text-muted)',border:'1px solid var(--line-2)',borderRadius:4,padding:'3px 5px',background:'var(--surface-app)'}}>{shortcut}</kbd>:null}
  </label>;
}
