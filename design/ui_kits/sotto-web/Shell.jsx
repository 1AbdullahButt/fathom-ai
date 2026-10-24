(() => {
const { useState, useEffect } = React;
const { Avatar, Icon, SegmentedControl, Badge } = window.SottoDesignSystem_5b0428;

function fmtTime(sec = 0) { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; const p = n => String(n).padStart(2, '0'); return h ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s); }

function useViewport() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => { const f = () => setW(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return w < 760 ? 'phone' : w < 1200 ? 'mid' : 'wide';
}

function usePlayback(duration, opts = {}) {
  const start = opts.start || 0, end = opts.end ?? duration;
  const [t, setT] = useState(opts.initial ?? start);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT(x => { const n = x + 0.25 * rate; if (n >= end) { setPlaying(false); return end; } return n; }), 250);
    return () => clearInterval(id);
  }, [playing, rate, end]);
  const seek = s => setT(Math.max(start, Math.min(end, s)));
  return {
    t, playing, rate, seek, setPlaying,
    toggle: () => { if (!playing && t >= end) setT(start); setPlaying(p => !p); },
    jump: s => { seek(s); setPlaying(true); },
    cycleRate: () => setRate(r => r === 1 ? 1.5 : r === 1.5 ? 2 : r === 2 ? 0.75 : 1)
  };
}

function Wordmark({ size = 22, color = 'var(--ink-900)' }) {
  return <span style={{ font: '500 ' + size + 'px/1 var(--font-serif)', color, letterSpacing: '-.01em' }}>Sotto</span>;
}

function NavItem({ icon, label, active, onClick }) {
  const [h, setH] = useState(false);
  return <button type="button" onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 10px', border: 0, borderRadius: 'var(--radius-sm)', background: active ? 'var(--surface-card)' : h ? 'var(--paper-150)' : 'transparent', boxShadow: active ? 'var(--shadow-1)' : 'none', color: active ? 'var(--text-1)' : 'var(--text-2)', font: (active ? 600 : 500) + ' 14px/1 var(--font-sans)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
    <Icon name={icon} size={17} />{label}
  </button>;
}

function Sidebar({ go, toast }) {
  return <aside style={{ width: 'var(--sidebar-w)', flexShrink: 0, height: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 14px', background: 'var(--paper-100)', borderRight: '1px solid var(--line-1)' }}>
    <div style={{ padding: '4px 10px' }}><Wordmark /></div>
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <NavItem icon="list" label="Meetings" active onClick={() => go('#/')} />
      <NavItem icon="scissors" label="Clips" onClick={() => toast('Clips library isn’t part of this kit')} />
      <NavItem icon="settings" label="Settings" onClick={() => toast('Settings aren’t part of this kit')} />
    </nav>
    <div style={{ flex: 1 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 10px', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', border: '1px solid var(--line-1)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: '600 12px/1.3 var(--font-sans)', color: 'var(--text-1)' }}><Icon name="mic" size={14} />No bot joins your calls</span>
      <span style={{ font: '400 12px/1.45 var(--font-sans)', color: 'var(--text-muted)' }}>Sotto records on this device, or works from a file you upload.</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px' }}>
      <Avatar name="Maya Lindqvist" color="var(--spk-1)" size={28} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><span style={{ font: '600 13px/1.2 var(--font-sans)' }}>Maya Lindqvist</span><span style={{ font: '400 12px/1.2 var(--font-sans)', color: 'var(--text-muted)' }}>Northstar team</span></span>
    </div>
  </aside>;
}

function PhoneBar({ left, right }) {
  return <header style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 12px 0 16px', borderBottom: '1px solid var(--line-1)', background: 'var(--surface-app)' }}>{left}{right}</header>;
}

function DemoBar({ states, value, onChange }) {
  return <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 14, zIndex: 90, display: 'flex', alignItems: 'center', gap: 8, padding: '5px 5px 5px 12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', border: '1px solid var(--line-2)', boxShadow: 'var(--shadow-3)', maxWidth: 'calc(100vw - 16px)', overflowX: 'auto' }}>
    <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Demo state</span>
    <SegmentedControl size="sm" value={value} onChange={onChange} options={states} />
  </div>;
}

// Simulated media surface: speaker view with live captions (no real media file in the kit).
function Stage({ spk, line, playing, onToggle, height = 'min(40vh, 380px)', captions = true, label = 'Speaker view', compact = false }) {
  const { Avatar } = window.SottoDesignSystem_5b0428;
  return <div onClick={onToggle} style={{ position: 'relative', width: '100%', height, background: 'var(--night-950)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
    <div style={{ position: 'absolute', top: 12, left: 12 }}><Badge tone="dark" size="sm" icon="video">{label}</Badge></div>
    {spk ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 8 : 12, marginTop: captions ? -28 : 0 }}>
      <Avatar name={spk.name} color={spk.color} size={compact ? 56 : 88} speaking={playing} style={{ boxShadow: playing ? '0 0 0 3px var(--night-950), 0 0 0 5px ' + spk.color : 'none' }} />
      <span style={{ color: 'var(--night-100)', font: '500 ' + (compact ? 13 : 14) + 'px/1.2 var(--font-sans)' }}>{spk.name}</span>
    </div> : null}
    {!playing ? <span style={{ position: 'absolute', top: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,.1)', color: 'var(--night-100)', font: '500 12px/1 var(--font-sans)' }}><Icon name="pause" size={12} />Paused</span> : null}
    {captions && line ? <div style={{ position: 'absolute', left: '50%', bottom: compact ? 10 : 18, transform: 'translateX(-50%)', width: 'min(86%, 640px)', textAlign: 'center', padding: compact ? '6px 10px' : '8px 14px', borderRadius: 6, background: 'rgba(0,0,0,.62)', color: '#fff', font: '400 ' + (compact ? 13 : 15) + 'px/1.45 var(--font-sans)', textWrap: 'balance' }}>{line.text}</div> : null}
  </div>;
}

Object.assign(window, { fmtTime, useViewport, usePlayback, Wordmark, Sidebar, PhoneBar, DemoBar, Stage });
})();
