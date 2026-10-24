import React from 'react';
export function Spinner({size=18,color='var(--accent)',label}){
  return <svg role={label?'status':undefined} aria-label={label} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{animation:'sotto-spin .9s linear infinite',flexShrink:0,display:'block'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
