(() => {
const { useState, useEffect, useMemo, useRef } = React;
const { Button, IconButton, Input, SegmentedControl, MeetingRow, StateBlock, Skeleton, Dialog, Icon, Avatar } = window.SottoDesignSystem_5b0428;
const D = window.SOTTO_DATA;

function snippetFor(m, q) {
  if (!q || !m.text) return null;
  const i = m.text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return null;
  return m.text.slice(Math.max(0, i - 50), i + q.length + 70).replace(/^\S*\s/, '');
}

function UploadDialog({ onClose, onUpload }) {
  const [over, setOver] = useState(false);
  return <Dialog title="Upload a recording" description="We’ll transcribe it, find speakers and chapters, and write a summary you can check against the quotes." onClose={onClose} width={520}
    footer={<Button onClick={onClose}>Cancel</Button>}>
    <div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); onUpload('Partner interview — Brightline.m4a'); }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '32px 20px', borderRadius: 'var(--radius-md)', border: '1.5px dashed ' + (over ? 'var(--accent)' : 'var(--paper-300)'), background: over ? 'var(--accent-soft)' : 'var(--surface-app)', textAlign: 'center' }}>
      <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="cloud-upload" size={22} /></span>
      <span style={{ font: '600 15px/1.3 var(--font-sans)' }}>Drop a video or audio file</span>
      <span style={{ font: '400 13px/1.4 var(--font-sans)', color: 'var(--text-muted)' }}>MP4, MOV, M4A, MP3 or WAV · up to 4 hours</span>
      <Button variant="primary" icon="upload" onClick={() => onUpload('Partner interview — Brightline.m4a')}>Choose file</Button>
    </div>
  </Dialog>;
}

function RecordDialog({ onClose, onStart }) {
  const [src, setSrc] = useState('tab');
  return <Dialog title="Record on this device" description="No bot joins the call. Sotto captures audio here — let everyone know you’re recording." onClose={onClose} width={480}
    footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon="mic" onClick={onStart}>Start recording</Button></>}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ font: 'var(--type-label)', color: 'var(--text-2)' }}>Capture</span>
      <SegmentedControl fullWidth value={src} onChange={setSrc} options={[{ value: 'mic', label: 'Microphone', icon: 'mic' }, { value: 'tab', label: 'Tab + mic', icon: 'audio-lines' }, { value: 'screen', label: 'Screen', icon: 'video' }]} />
    </div>
  </Dialog>;
}

function RecordingBar({ startedAt, onStop }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(id); }, []);
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px 10px 16px', borderRadius: 'var(--radius-md)', background: 'var(--ink-900)', color: 'var(--paper-50)' }}>
    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--record)', animation: 'sotto-pulse 1.6s var(--ease-in-out) infinite' }} />
    <span style={{ font: '500 14px/1 var(--font-sans)', flex: 1 }}>Recording on this device</span>
    <span style={{ font: '400 13px/1 var(--font-mono)', color: 'var(--night-300)' }}>{window.fmtTime((Date.now() - startedAt) / 1000)}</span>
    <Button size="sm" variant="player" icon="square" onClick={onStop}>Stop</Button>
  </div>;
}

function ListSkeleton() {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 14, padding: '14px 16px' }}>
      <Skeleton width={40} height={40} radius="var(--radius-sm)" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 3 }}><Skeleton width={['52%', '38%', '61%', '44%', '33%'][i]} height={13} /><Skeleton width="28%" height={10} /></div>
    </div>)}
  </div>;
}

function MeetingsList({ state, go, toast, vp }) {
  const phone = vp === 'phone';
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [meetings, setMeetings] = useState(D.MEETINGS);
  const [dialog, setDialog] = useState(null);
  const [rec, setRec] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const k = e => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); const el = document.getElementById('meeting-search'); el && el.focus(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  useEffect(() => {
    if (!meetings.some(m => m.status === 'processing')) return;
    const id = setInterval(() => setMeetings(ms => ms.map(m => {
      if (m.status !== 'processing') return m;
      const p = m.progress + 3;
      if (p >= 100) { toast(m.title + ' is ready', 'success'); return { ...m, status: 'ready', progress: 100, duration: m.duration || 1290 }; }
      return { ...m, progress: p };
    })), 400);
    return () => clearInterval(id);
  }, [meetings]);

  const addProcessing = (title, source, media) => setMeetings(ms => [{ id: 'new' + Date.now(), title, date: 'Just now', group: 'Today', source, media, speakers: [D.SPEAKERS[0]], status: 'processing', progress: 2 }, ...ms]);

  const list = useMemo(() => meetings.filter(m => (filter === 'All' || (filter === 'Uploaded' ? m.source === 'upload' : m.source === 'recording')) && (!q || m.title.toLowerCase().includes(q.toLowerCase()) || snippetFor(m, q))), [meetings, q, filter]);
  const groups = useMemo(() => { const g = []; list.forEach(m => { let x = g.find(y => y.h === m.group); if (!x) g.push(x = { h: m.group, items: [] }); x.items.push(m); }); return g; }, [list]);

  const actions = <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: phone ? '100%' : 'auto' }}>
    <Button variant="primary" size="lg" icon="mic" fullWidth onClick={() => setDialog('record')} disabled={!!rec}>Record</Button>
    <Button variant="primary" size="lg" icon="upload" fullWidth onClick={() => setDialog('upload')}>Upload</Button>
  </div>;

  let body;
  if (state === 'loading') body = <ListSkeleton />;
  else if (state === 'error') body = <StateBlock kind="error" title="Couldn’t load your meetings" body="We lost the connection to Sotto. Your recordings and notes are safe." actions={<Button icon="refresh-cw" onClick={() => go('#/?state=ready')}>Try again</Button>} />;
  else if (state === 'empty') body = <StateBlock kind="empty" title="No meetings yet" body="Record a call on this device, or upload a recording you already have. No bot ever joins your meetings." actions={<><Button variant="primary" icon="mic" onClick={() => setDialog('record')}>Record</Button><Button variant="primary" icon="upload" onClick={() => setDialog('upload')}>Upload</Button></>} />;
  else if (!list.length) body = <StateBlock kind="noResults" title={'Nothing matches “' + q + '”'} body="Search covers meeting titles and every word in their transcripts." actions={<Button onClick={() => { setQ(''); setFilter('All'); }}>Clear search</Button>} />;
  else body = <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
    {groups.map(g => <section key={g.h}>
      <h2 style={{ margin: '0 0 2px', padding: phone ? '0 12px' : '0 16px', font: 'var(--type-overline)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{g.h}</h2>
      {g.items.map(m => <MeetingRow key={m.id} {...m} compact={phone} query={q} snippet={snippetFor(m, q)}
        onClick={() => m.id === 'q3' ? go('#/m/q3') : toast('Only “Q3 roadmap review” is fully seeded in this kit')}
        onRetry={() => setMeetings(ms => ms.map(x => x.id === m.id ? { ...x, status: 'processing', progress: 4 } : x))} />)}
    </section>)}
  </div>;

  return <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
    {phone ? <window.PhoneBar left={<window.Wordmark size={20} />} right={<Avatar name="Maya Lindqvist" color="var(--spk-1)" size={28} />} /> : null}
    <main style={{ width: '100%', maxWidth: 920, margin: '0 auto', padding: phone ? '16px 8px 96px' : '36px 32px 96px', display: 'flex', flexDirection: 'column', gap: phone ? 14 : 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, padding: phone ? '0 8px' : 0 }}>
        <div>
          <h1 style={{ margin: 0, font: '400 ' + (phone ? 26 : 32) + 'px/1.15 var(--font-serif)', letterSpacing: '-.01em' }}>Meetings</h1>
          {!phone ? <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>Recorded on your device or uploaded — never with a bot in the call.</p> : null}
        </div>
        {actions}
      </div>
      {rec ? <div style={{ padding: phone ? '0 8px' : 0 }}><RecordingBar startedAt={rec} onStop={() => { setRec(null); addProcessing('Recording — ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 'recording', 'audio'); }} /></div> : null}
      {state === 'ready' ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: phone ? '0 8px' : 0 }}>
        <Input id="meeting-search" icon="search" size={phone ? 'md' : 'lg'} placeholder="Search titles and transcripts" shortcut={phone ? null : '/'} value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} style={{ flex: '1 1 280px' }} />
        <SegmentedControl value={filter} onChange={setFilter} options={['All', 'Recorded', 'Uploaded']} />
      </div> : null}
      {body}
    </main>
    {dialog === 'upload' ? <UploadDialog onClose={() => setDialog(null)} onUpload={name => { setDialog(null); addProcessing(name, 'upload', 'audio'); toast('Uploading ' + name, 'info'); }} /> : null}
    {dialog === 'record' ? <RecordDialog onClose={() => setDialog(null)} onStart={() => { setDialog(null); setRec(Date.now()); }} /> : null}
  </div>;
}

window.MeetingsList = MeetingsList;
})();
