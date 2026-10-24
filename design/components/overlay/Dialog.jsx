import React from 'react';
import { IconButton } from '../core/IconButton.jsx';
export function Dialog({open=true,title,description,children,footer,onClose,width=480,inline=false}){
  React.useEffect(()=>{if(inline||!open||!onClose)return;const k=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[open,inline,onClose]);
  if(!open) return null;
  const card=<div role="dialog" aria-modal={!inline} aria-label={title} onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:width,background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:inline?'var(--shadow-2)':'var(--shadow-3)',border:'1px solid var(--line-1)',overflow:'hidden',animation:inline?'none':'sotto-fade-up var(--dur-3) var(--ease-out)'}}>
    <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'18px 18px 0 20px'}}>
      <div style={{flex:1}}>
        <div style={{font:'600 17px/1.35 var(--font-sans)',color:'var(--text-1)'}}>{title}</div>
        {description?<div style={{font:'400 14px/1.5 var(--font-sans)',color:'var(--text-muted)',marginTop:4}}>{description}</div>:null}
      </div>
      {onClose?<IconButton icon="x" label="Close" size="sm" onClick={onClose}/>:null}
    </div>
    <div style={{padding:'16px 20px'}}>{children}</div>
    {footer?<div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'12px 20px',borderTop:'1px solid var(--line-1)',background:'var(--surface-app)'}}>{footer}</div>:null}
  </div>;
  if(inline) return card;
  return <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(28,26,23,.32)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>{card}</div>;
}
