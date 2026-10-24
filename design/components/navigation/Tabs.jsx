import React from 'react';
export function Tabs({tabs=[],value,onChange,fill=false,size='md'}){
  return <div role="tablist" style={{display:'flex',gap:fill?0:20,borderBottom:'1px solid var(--line-1)'}}>
    {tabs.map(t=>{const on=t.id===value;return <button key={t.id} role="tab" aria-selected={on} type="button" onClick={()=>onChange&&onChange(t.id)} style={{flex:fill?1:'none',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,height:size==='sm'?36:42,padding:fill?'0 8px':0,marginBottom:-1,border:0,borderBottom:'2px solid '+(on?'var(--ink-900)':'transparent'),background:'none',cursor:'pointer',color:on?'var(--text-1)':'var(--text-muted)',font:(on?600:500)+' 14px/1 var(--font-sans)',transition:'color var(--dur-1)'}}>
      {t.label}{t.count!=null?<span style={{font:'500 11.5px/1 var(--font-sans)',padding:'3px 6px',borderRadius:999,background:on?'var(--ink-900)':'var(--paper-150)',color:on?'var(--paper-50)':'var(--ink-600)'}}>{t.count}</span>:null}
    </button>;})}
  </div>;
}
