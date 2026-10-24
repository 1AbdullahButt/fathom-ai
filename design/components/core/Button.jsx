import React from 'react';
import { Icon } from './Icon.jsx';
import { Spinner } from '../feedback/Spinner.jsx';
const SIZES={sm:{h:28,px:10,fs:13,gap:6,ic:15},md:{h:36,px:14,fs:14,gap:8,ic:17},lg:{h:44,px:18,fs:15,gap:8,ic:18}};
const V={
 primary:{bg:'var(--accent)',h:'var(--accent-hover)',p:'var(--accent-press)',fg:'var(--text-on-accent)',bd:'transparent'},
 secondary:{bg:'var(--surface-card)',h:'var(--surface-hover)',p:'var(--paper-200)',fg:'var(--text-1)',bd:'var(--line-2)'},
 ghost:{bg:'transparent',h:'var(--surface-hover)',p:'var(--paper-200)',fg:'var(--text-1)',bd:'transparent'},
 danger:{bg:'var(--surface-card)',h:'var(--danger-soft)',p:'var(--rust-100)',fg:'var(--danger-text)',bd:'var(--rust-100)'},
 player:{bg:'rgba(255,255,255,.08)',h:'rgba(255,255,255,.14)',p:'rgba(255,255,255,.2)',fg:'var(--text-on-player)',bd:'transparent'}
};
export function Button({variant='secondary',size='md',icon,iconRight,iconColor,loading=false,disabled=false,fullWidth=false,type='button',children,onClick,style,...rest}){
  const [h,setH]=React.useState(false);const [p,setP]=React.useState(false);
  const s=SIZES[size]||SIZES.md;const v=V[variant]||V.secondary;const off=disabled||loading;
  return <button type={type} disabled={off} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>{setH(false);setP(false);}} onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)}
    style={{display:fullWidth?'flex':'inline-flex',width:fullWidth?'100%':undefined,alignItems:'center',justifyContent:'center',gap:s.gap,height:s.h,padding:'0 '+s.px+'px',borderRadius:'var(--radius-sm)',border:'1px solid '+v.bd,background:off?v.bg:p?v.p:h?v.h:v.bg,color:v.fg,font:'500 '+s.fs+'px/1 var(--font-sans)',whiteSpace:'nowrap',cursor:off?'default':'pointer',opacity:disabled?.45:1,transition:'background var(--dur-1) var(--ease-out)',boxShadow:variant==='secondary'?'var(--shadow-1)':'none',...style}} {...rest}>
    {loading?<Spinner size={s.ic} color="currentColor"/>:icon?<Icon name={icon} size={s.ic} color={iconColor||'currentColor'}/>:null}
    {children}
    {iconRight?<Icon name={iconRight} size={s.ic}/>:null}
  </button>;
}
