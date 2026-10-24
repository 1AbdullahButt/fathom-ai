import React from 'react';
import { IconButton } from '../core/IconButton.jsx';
import { formatTime } from './Timestamp.jsx';
export function PlayerControls({playing=false,current=0,duration=3600,onToggle,onSeek,rate=1,onRate,chapters=[],range,compact=false,onFullscreen}){
  const ref=React.useRef(null);const [hx,setHx]=React.useState(null);
  const seek=e=>{const r=ref.current.getBoundingClientRect();const p=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));onSeek&&onSeek(p*duration);};
  const pct=v=>(v/duration*100)+'%';
  return <div style={{display:'flex',flexDirection:'column',gap:8,padding:compact?'8px 10px 10px':'10px 14px 12px',background:'var(--surface-player)',color:'var(--text-on-player)'}}>
    <div ref={ref} onClick={seek} onMouseMove={e=>{const r=ref.current.getBoundingClientRect();setHx((e.clientX-r.left)/r.width);}} onMouseLeave={()=>setHx(null)} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.round(current)} tabIndex={0}
      onKeyDown={e=>{if(e.key==='ArrowRight')onSeek&&onSeek(Math.min(duration,current+5));if(e.key==='ArrowLeft')onSeek&&onSeek(Math.max(0,current-5));}}
      style={{position:'relative',height:16,cursor:'pointer',display:'flex',alignItems:'center'}}>
      <div style={{position:'absolute',left:0,right:0,height:4,borderRadius:2,background:'var(--night-700)'}}/>
      {range?<div style={{position:'absolute',left:pct(range[0]),width:pct(range[1]-range[0]),height:4,background:'var(--night-500)'}}/>:null}
      <div style={{position:'absolute',left:0,width:pct(current),height:4,borderRadius:2,background:'var(--tide-200)'}}/>
      {chapters.slice(1).map((c,i)=><div key={i} title={c.title} style={{position:'absolute',left:pct(c.seconds),width:2,height:8,marginLeft:-1,background:'var(--surface-player)'}}/>)}
      {hx!=null?<div style={{position:'absolute',left:(hx*100)+'%',bottom:16,transform:'translateX(-50%)',padding:'3px 6px',borderRadius:4,background:'var(--night-700)',font:'400 11px/1 var(--font-mono)',whiteSpace:'nowrap',pointerEvents:'none'}}>{formatTime(hx*duration)}</div>:null}
      <div style={{position:'absolute',left:pct(current),width:12,height:12,marginLeft:-6,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.4)'}}/>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:compact?2:6}}>
      <IconButton icon="rotate-ccw" label="Back 10 seconds" variant="player" size="sm" onClick={()=>onSeek&&onSeek(Math.max(0,current-10))}/>
      <IconButton icon={playing?'pause':'play'} label={playing?'Pause':'Play'} variant="playerPrimary" size={compact?'md':'md'} onClick={onToggle}/>
      <IconButton icon="rotate-cw" label="Forward 10 seconds" variant="player" size="sm" onClick={()=>onSeek&&onSeek(Math.min(duration,current+10))}/>
      <span style={{marginLeft:6,font:'400 12.5px/1 var(--font-mono)',fontVariantNumeric:'tabular-nums',color:'var(--text-on-player)',whiteSpace:'nowrap'}}>{formatTime(current)}<span style={{color:'var(--text-on-player-muted)'}}> / {formatTime(duration)}</span></span>
      <span style={{flex:1}}/>
      {onRate?<button type="button" onClick={onRate} aria-label="Playback speed" style={{height:28,minWidth:40,padding:'0 8px',border:0,borderRadius:'var(--radius-sm)',background:'rgba(255,255,255,.08)',color:'var(--text-on-player)',font:'500 12px/1 var(--font-mono)',cursor:'pointer'}}>{rate}×</button>:null}
      {onFullscreen?<IconButton icon="maximize-2" label="Full screen" variant="player" size="sm" onClick={onFullscreen}/>:null}
    </div>
  </div>;
}
