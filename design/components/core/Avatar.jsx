import React from 'react';
export function initials(name=''){const p=name.trim().split(/\s+/);return ((p[0]||'')[0]||'').toUpperCase()+((p.length>1?p[p.length-1][0]:'')||'').toUpperCase();}
export function Avatar({name,color='var(--ink-500)',size=28,speaking=false,ring,style}){
  return <span title={name} style={{width:size,height:size,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:'color-mix(in oklab, '+color+' 15%, var(--paper-0))',color:color,font:'600 '+Math.round(size*0.38)+'px/1 var(--font-sans)',letterSpacing:'.02em',boxShadow:speaking?'0 0 0 2px var(--paper-0), 0 0 0 4px '+color:ring?'0 0 0 2px '+ring:'none',transition:'box-shadow var(--dur-2) var(--ease-out)',...style}}>{initials(name)}</span>;
}
