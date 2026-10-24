import React from 'react';
export function ProgressBar({value=0,tone='accent',height=4,label,indeterminate=false}){
  const c=tone==='danger'?'var(--danger)':tone==='warn'?'var(--warn-mark)':'var(--accent)';
  return <span role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label} style={{display:'block',width:'100%',height,borderRadius:999,background:'var(--paper-200)',overflow:'hidden'}}>
    <span style={{display:'block',height:'100%',width:indeterminate?'35%':Math.max(0,Math.min(100,value))+'%',background:c,borderRadius:999,transition:'width var(--dur-3) var(--ease-out)',animation:indeterminate?'sotto-pulse 1.4s var(--ease-in-out) infinite':'none'}}/>
  </span>;
}
