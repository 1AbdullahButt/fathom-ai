import React from 'react';
import { QuoteChip } from './QuoteChip.jsx';
import { ConfidenceFlag } from './ConfidenceFlag.jsx';
import { HumanEdit } from './HumanEdit.jsx';
import { IconButton } from '../core/IconButton.jsx';
export function SummaryPoint({text,edited,confidence,lowReason,quote,onJump,active=false,onEdit}){
  const [h,setH]=React.useState(false);
  return <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:'grid',gridTemplateColumns:'14px minmax(0,1fr) 28px',gap:'0 8px',padding:'10px 0'}}>
    <span style={{width:5,height:5,borderRadius:'50%',background:edited?'var(--human-mark)':'var(--ink-400)',marginTop:9,justifySelf:'center'}}/>
    <div style={{display:'flex',flexDirection:'column',gap:8,minWidth:0}}>
      <div style={{font:'400 14.5px/1.55 var(--font-sans)',color:'var(--text-1)',textWrap:'pretty'}}>{edited?<HumanEdit editor={edited.by} editedAt={edited.at}>{text}</HumanEdit>:text}</div>
      {confidence==='low'?<span><ConfidenceFlag reason={lowReason}/></span>:null}
      {quote?<QuoteChip {...quote} onJump={onJump} active={active}/>:null}
    </div>
    <span style={{opacity:h&&onEdit?1:0,transition:'opacity var(--dur-1)'}}>{onEdit?<IconButton icon="pencil" label="Edit point" size="sm" onClick={onEdit}/>:null}</span>
  </div>;
}
