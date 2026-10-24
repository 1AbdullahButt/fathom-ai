import React from 'react';
import { Icon } from './Icon.jsx';
const SZ={sm:{d:28,i:16},md:{d:36,i:18},lg:{d:44,i:20},xl:{d:56,i:24}};
const V={
 ghost:{bg:'transparent',h:'var(--surface-hover)',fg:'var(--text-2)',bd:'transparent',a:'var(--accent-soft)',afg:'var(--accent)'},
 secondary:{bg:'var(--surface-card)',h:'var(--surface-hover)',fg:'var(--text-1)',bd:'var(--line-2)',a:'var(--accent-soft)',afg:'var(--accent)'},
 player:{bg:'transparent',h:'rgba(255,255,255,.12)',fg:'var(--text-on-player)',bd:'transparent',a:'rgba(255,255,255,.16)',afg:'#fff'},
 playerPrimary:{bg:'var(--paper-0)',h:'var(--paper-150)',fg:'var(--ink-900)',bd:'transparent',a:'var(--paper-0)',afg:'var(--ink-900)'}
};
export function IconButton({icon,label,variant='ghost',size='md',active=false,disabled=false,onClick,round,style,...rest}){
  const [h,setH]=React.useState(false);const s=SZ[size]||SZ.md;const v=V[variant]||V.ghost;
  const isRound=round??(variant==='playerPrimary');
  return <button type="button" aria-label={label} title={label} aria-pressed={active||undefined} disabled={disabled} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{width:s.d,height:s.d,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0,borderRadius:isRound?'50%':'var(--radius-sm)',border:'1px solid '+v.bd,background:active?v.a:h&&!disabled?v.h:v.bg,color:active?v.afg:v.fg,cursor:disabled?'default':'pointer',opacity:disabled?.4:1,padding:0,transition:'background var(--dur-1) var(--ease-out)',...style}} {...rest}>
    <Icon name={icon} size={s.i} strokeWidth={variant==='playerPrimary'?2:1.75}/>
  </button>;
}
