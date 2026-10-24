import React from 'react';
export function Tooltip({label,side='top',children,forceOpen=false}){
  const [o,setO]=React.useState(false);const show=o||forceOpen;
  const pos=side==='bottom'?{top:'calc(100% + 6px)'}:{bottom:'calc(100% + 6px)'};
  return <span style={{position:'relative',display:'inline-flex'}} onMouseEnter={()=>setO(true)} onMouseLeave={()=>setO(false)} onFocus={()=>setO(true)} onBlur={()=>setO(false)}>
    {children}
    {show?<span role="tooltip" style={{position:'absolute',left:'50%',transform:'translateX(-50%)',...pos,zIndex:50,whiteSpace:'nowrap',padding:'5px 8px',borderRadius:'var(--radius-xs)',background:'var(--ink-900)',color:'var(--paper-50)',font:'500 12px/1.3 var(--font-sans)',boxShadow:'var(--shadow-2)',pointerEvents:'none'}}>{label}</span>:null}
  </span>;
}
