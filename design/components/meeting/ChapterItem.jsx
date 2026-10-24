import React from 'react';
import { formatTime } from './Timestamp.jsx';
export function ChapterItem({index,title,seconds=0,duration,active=false,progress=0,onClick}){
  const [h,setH]=React.useState(false);
  return <button type="button" onClick={()=>onClick&&onClick(seconds)} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} aria-current={active||undefined}
    style={{position:'relative',display:'grid',gridTemplateColumns:'22px minmax(0,1fr) auto',alignItems:'baseline',gap:8,width:'100%',padding:'9px 10px',border:0,borderRadius:'var(--radius-sm)',background:active?'var(--surface-selected)':h?'var(--surface-hover)':'transparent',cursor:'pointer',textAlign:'left',overflow:'hidden'}}>
    <span style={{font:'500 11px/1 var(--font-mono)',color:active?'var(--accent)':'var(--text-disabled)'}}>{String(index).padStart(2,'0')}</span>
    <span style={{font:(active?600:500)+' 13.5px/1.35 var(--font-sans)',color:active?'var(--tide-700)':'var(--text-1)',textWrap:'pretty'}}>{title}</span>
    <span style={{font:'400 12px/1 var(--font-mono)',color:'var(--text-muted)',fontVariantNumeric:'tabular-nums'}}>{formatTime(seconds)}</span>
    {active?<span style={{position:'absolute',left:10,right:10,bottom:3,height:2,borderRadius:2,background:'var(--tide-100)'}}><span style={{display:'block',height:'100%',width:Math.round(progress*100)+'%',background:'var(--accent)',borderRadius:2}}/></span>:null}
  </button>;
}
