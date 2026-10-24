import React from 'react';
export function formatTime(sec=0){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;const p=n=>String(n).padStart(2,'0');return h?h+':'+p(m)+':'+p(s):m+':'+p(s);}
export function Timestamp({seconds=0,end,onClick,active=false,tone='default',style}){
  const [h,setH]=React.useState(false);const txt=formatTime(seconds)+(end!=null?'–'+formatTime(end):'');
  const dark=tone==='player';
  const base={font:'400 12px/1 var(--font-mono)',fontVariantNumeric:'tabular-nums',color:active?'var(--accent)':dark?'var(--text-on-player-muted)':'var(--text-muted)',padding:'3px 5px',margin:'0 -5px',borderRadius:4,whiteSpace:'nowrap',...style};
  if(!onClick) return <span style={base}>{txt}</span>;
  return <button type="button" aria-label={'Jump to '+txt} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{...base,border:0,cursor:'pointer',background:h?(dark?'rgba(255,255,255,.1)':'var(--accent-soft)'):'transparent',color:h?(dark?'#fff':'var(--accent)'):base.color}}>{txt}</button>;
}
