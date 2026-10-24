(() => {
const { useState, useEffect, useRef, useMemo } = React;
const { Button, IconButton, Badge, AvatarStack, Input, Switch, Tabs, SegmentedControl, PlayerControls, TranscriptLine, ChapterItem, TalkTimeBar, StateBlock, Skeleton, Icon } = window.SottoDesignSystem_5b0428;
const D = window.SOTTO_DATA;
const spk = id => D.SPEAKERS.find(s => s.id === id);

function Overline({ children, right }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', height: 28 }}>
    <span style={{ font: 'var(--type-overline)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{children}</span>{right}
  </div>;
}

function Chapters({ t, jump }) {
  const ai = D.CHAPTERS.filter(c => c.seconds <= t).length - 1;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {D.CHAPTERS.map((c, i) => { const end = (D.CHAPTERS[i + 1] || { seconds: D.DURATION }).seconds; return <ChapterItem key={i} index={i + 1} title={c.title} seconds={c.seconds} active={i === ai} progress={(t - c.seconds) / (end - c.seconds)} onClick={jump} />; })}
  </div>;
}

function Speakers({ sel, setSel, activeSpk }) {
  const total = Object.values(D.TALK).reduce((a, b) => a + b, 0);
  const sorted = [...D.SPEAKERS].sort((a, b) => D.TALK[b.id] - D.TALK[a.id]);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {sorted.map(s => <TalkTimeBar key={s.id} name={s.name} color={s.color} seconds={D.TALK[s.id]} total={total} selected={sel.includes(s.id)} dimmed={sel.length > 0 && !sel.includes(s.id)} speaking={activeSpk === s.id}
      onToggle={() => setSel(x => x.includes(s.id) ? x.filter(y => y !== s.id) : [...x, s.id])} />)}
  </div>;
}

function Transcript({ lines, activeIdx, jump, query, follow, filtered }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!follow || !ref.current) return;
    const el = ref.current.querySelector('[data-i="' + activeIdx + '"]');
    if (!el) return;
    const c = ref.current; const top = el.offsetTop - c.offsetTop;
    if (top < c.scrollTop + 40 || top > c.scrollTop + c.clientHeight * 0.6) c.scrollTo({ top: top - c.clientHeight * 0.25, behavior: 'smooth' });
  }, [activeIdx, follow]);
  return <div ref={ref} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 8px 96px', position: 'relative' }}>
    {!lines.length ? <StateBlock compact kind="noResults" title="No lines match" body={query ? 'Nothing in the transcript matches “' + query + '”.' : 'No lines from the selected speakers.'} /> :
      lines.map((l, k) => { const s = spk(l.spk); const prev = lines[k - 1]; return <div key={l.i} data-i={l.i} style={{ maxWidth: 760 }}>
        <TranscriptLine speaker={s.name} color={s.color} seconds={l.t} text={l.text} active={l.i === activeIdx} showSpeaker={filtered || !prev || prev.spk !== l.spk || l.t - prev.end > 30} onJump={jump} query={query} />
      </div>; })}
  </div>;
}

function TranscriptSkeleton() {
  return <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>{[0, 1, 2, 3, 4].map(i => <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 12 }}><Skeleton width={36} height={10} /><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Skeleton width={110} height={10} /><Skeleton lines={2} height={11} /></div></div>)}</div>;
}

function MeetingPage({ state, go, toast, vp, clips, setClips }) {
  const pb = window.usePlayback(D.DURATION, { initial: 1408 });
  const [tab, setTab] = useState('summary');
  const [phoneTab, setPhoneTab] = useState('transcript');
  const [navMode, setNavMode] = useState('lines');
  const [sel, setSel] = useState([]);
  const [q, setQ] = useState('');
  const [follow, setFollow] = useState(true);
  const phone = vp === 'phone', wide = vp === 'wide';

  const activeIdx = useMemo(() => { let a = 0; for (const l of D.LINES) { if (l.t <= pb.t) a = l.i; else break; } return a; }, [pb.t]);
  const activeLine = D.LINES[activeIdx];
  const lines = useMemo(() => D.LINES.filter(l => (!sel.length || sel.includes(l.spk)) && (!q || l.text.toLowerCase().includes(q.toLowerCase()))), [sel, q]);
  const jump = s => { pb.jump(s); setFollow(true); if (phone) setPhoneTab('transcript'), setNavMode('lines'); };
  const seekOnly = s => { pb.seek(s); setFollow(true); if (phone) setNavMode('lines'); };
  const panelProps = { jump, activeT: activeLine.t, t: pb.t, clips, setClips, toast, go };

  if (state === 'error') return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <TopBar go={go} phone={phone} minimal />
    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}><StateBlock kind="error" title="We couldn’t open this meeting" body="The recording is still stored, but its notes failed to load. Try again, or go back to your meetings." actions={<><Button icon="refresh-cw" variant="primary" onClick={() => go('#/m/q3?state=ready')}>Try again</Button><Button onClick={() => go('#/')}>Back to meetings</Button></>} /></div>
  </div>;

  const loading = state === 'loading', processing = state === 'processing';
  const player = <div style={{ flexShrink: 0, background: 'var(--surface-player)' }}>
    {loading ? <div style={{ height: phone ? 200 : 'min(40vh, 380px)', background: 'var(--night-950)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><window.SottoDesignSystem_5b0428.Spinner color="var(--night-300)" size={24} /></div> :
      <window.Stage spk={spk(activeLine.spk)} line={activeLine} playing={pb.playing} onToggle={pb.toggle} height={phone ? 200 : 'min(40vh, 380px)'} compact={phone} captions={!processing} label={processing ? 'Video ready · transcribing' : 'Speaker view'} />}
    <PlayerControls playing={pb.playing} current={pb.t} duration={D.DURATION} onToggle={pb.toggle} onSeek={seekOnly} rate={pb.rate} onRate={pb.cycleRate} chapters={processing ? [] : D.CHAPTERS} compact={phone} onFullscreen={phone ? undefined : () => toast('Full screen isn’t simulated in this kit', 'info')} />
  </div>;

  const toolbar = <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: phone ? '10px 12px' : '12px 20px', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
    {!wide ? <SegmentedControl size="sm" value={navMode} onChange={setNavMode} options={[{ value: 'lines', label: 'Transcript' }, { value: 'chapters', label: 'Chapters' }, { value: 'speakers', label: sel.length ? 'Speakers · ' + sel.length : 'Speakers' }]} /> : null}
    {(wide || navMode === 'lines') ? <Input size="sm" icon="search" placeholder="Find in transcript" value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} style={{ flex: '1 1 180px', maxWidth: 320 }} /> : null}
    {(wide || navMode === 'lines') && !phone ? <Switch checked={follow} onChange={setFollow} label="Follow playback" /> : null}
    {sel.length && (wide || navMode === 'lines') ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '400 13px/1 var(--font-sans)', color: 'var(--text-muted)' }}>{sel.length} of 8 speakers<Button size="sm" variant="ghost" onClick={() => setSel([])}>Clear</Button></span> : null}
  </div>;

  const transcriptArea = loading ? <TranscriptSkeleton /> : processing ? <StateBlock kind="processing" loading title="Transcribing · 64%" body="You can already play the recording. Speaker names, chapters and the transcript appear as each part finishes." /> :
    (!wide && navMode === 'chapters') ? <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 96px' }}><Chapters t={pb.t} jump={seekOnly} /></div> :
    (!wide && navMode === 'speakers') ? <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 96px' }}><p style={{ margin: '4px 10px 8px', font: '400 13px/1.45 var(--font-sans)', color: 'var(--text-muted)' }}>Talk time. Tap speakers to show only their lines.</p><Speakers sel={sel} setSel={setSel} activeSpk={activeLine.spk} /></div> :
    <Transcript lines={lines} activeIdx={activeIdx} jump={seekOnly} query={q} follow={follow && !q} filtered={sel.length > 0} />;

  if (phone) {
    const pt = [{ id: 'transcript', label: 'Transcript' }, { id: 'summary', label: 'Summary' }, { id: 'actions', label: 'Actions', count: state === 'empty' ? 0 : D.ACTIONS.length }, { id: 'highlights', label: 'Clips' }];
    return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <TopBar go={go} phone />
      {player}
      <div style={{ padding: '0 4px', flexShrink: 0 }}><Tabs fill size="sm" value={phoneTab} onChange={setPhoneTab} tabs={pt} /></div>
      {phoneTab === 'transcript' ? <>{!loading && !processing ? toolbar : null}{transcriptArea}</> :
        <div style={{ flex: 1, minHeight: 0 }}><window.SidePanel state={state} tab={phoneTab} setTab={setPhoneTab} hideTabs {...panelProps} /></div>}
    </div>;
  }

  return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
    <TopBar go={go} toast={toast} />
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: wide ? '260px minmax(0,1fr) var(--panel-w)' : 'minmax(0,1fr) 380px' }}>
      {wide ? <aside style={{ borderRight: '1px solid var(--line-1)', overflowY: 'auto', padding: '14px 10px 96px', display: 'flex', flexDirection: 'column', gap: 18, background: 'var(--paper-100)' }}>
        {loading ? <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 14 }}><Skeleton lines={7} height={12} gap={14} /></div> : processing ? <p style={{ margin: 10, font: '400 13px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>Chapters and talk time appear when the transcript is ready.</p> : <>
          <div><Overline>Chapters</Overline><Chapters t={pb.t} jump={seekOnly} /></div>
          <div><Overline right={sel.length ? <Button size="sm" variant="ghost" onClick={() => setSel([])}>Clear</Button> : null}>Speakers · talk time</Overline><Speakers sel={sel} setSel={setSel} activeSpk={activeLine.spk} /></div>
        </>}
      </aside> : null}
      <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
        {player}
        {!loading && !processing ? toolbar : null}
        {transcriptArea}
      </section>
      <aside style={{ borderLeft: '1px solid var(--line-1)', background: 'var(--surface-card)', minHeight: 0, paddingTop: 4 }}>
        <window.SidePanel state={state} tab={tab} setTab={setTab} {...panelProps} />
      </aside>
    </div>
  </div>;
}

function TopBar({ go, phone, minimal, toast }) {
  const m = D.MEETING;
  if (phone) return <window.PhoneBar left={<div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}><IconButton icon="arrow-left" label="Back to meetings" onClick={() => go('#/')} /><span style={{ font: '600 15px/1.2 var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{minimal ? 'Meeting' : m.title}</span></div>} right={minimal ? null : <IconButton icon="share-2" label="Share" onClick={() => toast && toast('Meeting link copied', 'link')} />} />;
  return <header style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px 0 12px', borderBottom: '1px solid var(--line-1)', background: 'var(--surface-app)' }}>
    <Button variant="ghost" icon="arrow-left" onClick={() => go('#/')}>Meetings</Button>
    <span style={{ width: 1, height: 22, background: 'var(--line-1)' }} />
    {minimal ? null : <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
        <span style={{ font: '400 20px/1.1 var(--font-serif)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 12.5px/1 var(--font-sans)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{m.date}<span>·</span><span style={{ fontFamily: 'var(--font-mono)' }}>{window.fmtTime(D.DURATION)}</span><span>·</span>8 speakers<Badge size="sm" tone="outline" icon="upload">Uploaded</Badge></span>
      </div>
      <AvatarStack people={D.SPEAKERS} max={5} />
      <Button icon="share-2" onClick={() => toast && toast('Meeting link copied — teammates need to sign in', 'link')}>Share</Button>
    </>}
  </header>;
}

window.MeetingPage = MeetingPage;
})();
