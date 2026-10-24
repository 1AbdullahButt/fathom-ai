import React from 'react';
import { Checkbox } from '../forms/Checkbox.jsx';
import { Avatar } from '../core/Avatar.jsx';
import { Icon } from '../core/Icon.jsx';
import { QuoteChip } from './QuoteChip.jsx';
import { ConfidenceFlag } from './ConfidenceFlag.jsx';
import { NotStated } from './NotStated.jsx';
import { HumanEdit } from './HumanEdit.jsx';
export function ActionItem({text,owner,due,done=false,onToggle,confidence,lowReason,edited,quote,onJump,active=false}){
  return <div style={{display:'grid',gridTemplateColumns:'22px minmax(0,1fr)',gap:'0 8px',padding:'12px 0'}}>
    <span style={{paddingTop:2}}><Checkbox checked={done} onChange={onToggle}/></span>
    <div style={{display:'flex',flexDirection:'column',gap:8,minWidth:0}}>
      <div style={{font:'400 14.5px/1.5 var(--font-sans)',color:done?'var(--text-muted)':'var(--text-1)',textDecoration:done?'line-through':'none',textDecorationColor:'var(--ink-400)',textWrap:'pretty'}}>{edited?<HumanEdit editor={edited.by} editedAt={edited.at}>{text}</HumanEdit>:text}</div>
      <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:6}}>
        {owner?<span style={{display:'inline-flex',alignItems:'center',gap:6,height:22,font:'500 12.5px/1 var(--font-sans)',color:'var(--ink-700)'}}><Avatar name={owner.name} color={owner.color} size={20}/>{owner.name}</span>:<NotStated kind="owner" label="Owner not stated"/>}
        {due?<span style={{display:'inline-flex',alignItems:'center',gap:5,height:22,padding:'0 7px',borderRadius:'var(--radius-xs)',background:'var(--paper-150)',font:'500 12px/1 var(--font-sans)',color:'var(--ink-700)'}}><Icon name="calendar" size={12}/>{due}</span>:<NotStated kind="date" label="Date not stated"/>}
        {confidence==='low'?<ConfidenceFlag reason={lowReason}/>:null}
      </div>
      {quote?<QuoteChip {...quote} onJump={onJump} active={active}/>:null}
    </div>
  </div>;
}
