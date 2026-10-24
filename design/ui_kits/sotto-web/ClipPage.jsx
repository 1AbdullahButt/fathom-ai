(() => {
const { useMemo } = React;
const { Button, Badge, PlayerControls, TranscriptLine, StateBlock, Skeleton, Avatar } = window.SottoDesignSystem_5b0428;
const D = window.SOTTO_DATA;
const spk = id => D.SPEAKERS.find(s => s.id === id);

function ClipPage({ id, state, clips, toast, vp }) {
  const phone = vp === 'phone';
  const clip = clips.find(c => c.id === id);
  const st = !clip && state === 'ready' ? 'notFound' : state;
  const c = clip || clips[0];
  const pb = window.usePlayback(D.DURATION, { start: c.start, end: c.end, initial: c.start });
  const lines = useMemo(() => D.LINES.filter(l => l.end > c.start && l.t < c.end), [c]);
  let activeIdx = lines.length ? lines[0].i : 0; for (const l of lines) if (l.t <= pb.t) activeIdx = l.i;
  const active = D.LINES[activeIdx];

  const header = <header style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: phone ? '0 16px' : '0 28px', borderBottom: '1px solid var(--line-1)' }}>
    <window.Wordmark size={20} />
    <a href="#/" style={{ font: '500 14px/1 var(--font-sans)' }}>Try Sotto free</a>
  </header>;

  let body;
  if (st === 'loading') body = <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <Skeleton width="55%" height={28} radius="var(--radius-sm)" /><Skeleton width="35%" height={12} />
    <div style={{ height: phone ? 210 : 380, borderRadius: 'var(--radius-lg)', background: 'var(--night-900)' }} />
    <Skeleton lines={3} height={12} />
  </div>;
  else if (st === 'notFound') body = <StateBlock kind="notFound" title="This clip isn’t available" body="The link may have expired, or the person who shared it turned sharing off. Ask them for a new link." />;
  else if (st === 'error') body = <StateBlock kind="error" title="We couldn’t play this clip" body="Something went wrong loading the video. The clip still exists — try again in a moment." actions={<Button icon="refresh-cw" variant="primary" onClick={() => (location.hash = '#/c/' + c.id + '?state=ready')}>Try again</Button>} />;
  else {
    const s = spk(c.spk);
    body = <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Badge tone="accent" icon="globe" size="sm">Public clip</Badge><Badge tone="outline" size="sm" icon="clock">{window.fmtTime(c.end - c.start)}</Badge></div>
        <h1 style={{ margin: 0, font: '400 ' + (phone ? 26 : 34) + 'px/1.15 var(--font-serif)', letterSpacing: '-.01em', textWrap: 'balance' }}>{c.title}</h1>
        <p style={{ margin: 0, font: '400 14px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>From <span style={{ color: 'var(--text-1)' }}>{D.MEETING.title}</span> · {window.fmtTime(c.start)}–{window.fmtTime(c.end)} of {window.fmtTime(D.DURATION)} · shared by {c.author}</p>
      </div>
      <div style={{ borderRadius: phone ? 'var(--radius-md)' : 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <window.Stage spk={spk(active.spk)} line={active} playing={pb.playing} onToggle={pb.toggle} height={phone ? 210 : 380} compact={phone} label="Clip" />
        <PlayerControls playing={pb.playing} current={pb.t - c.start} duration={c.end - c.start} onToggle={pb.toggle} onSeek={x => pb.seek(c.start + x)} rate={pb.rate} onRate={pb.cycleRate} compact={phone} />
      </div>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h2 style={{ margin: 0, font: 'var(--type-overline)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Transcript</h2>
          <Button size="sm" variant="ghost" icon="link" onClick={() => toast('Clip link copied', 'link')}>Copy link</Button>
        </div>
        <div style={{ margin: '0 -12px' }}>
          {lines.map((l, k) => { const sp = spk(l.spk); return <TranscriptLine key={l.i} speaker={sp.name} color={sp.color} seconds={l.t} text={l.text} active={l.i === activeIdx} showSpeaker={!k || lines[k - 1].spk !== l.spk} onJump={t => pb.jump(Math.max(c.start, t))} />; })}
        </div>
      </section>
      <p style={{ margin: '8px 0 0', paddingTop: 16, borderTop: '1px solid var(--line-1)', font: '400 13px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>Recorded with Sotto. No bot joined this meeting.</p>
    </>;
  }
  return <div style={{ flex: 1, minWidth: 0, minHeight: '100vh', background: 'var(--surface-app)' }}>
    {header}
    <main style={{ maxWidth: 760, margin: '0 auto', padding: phone ? '20px 16px 96px' : '40px 28px 96px', display: 'flex', flexDirection: 'column', gap: phone ? 18 : 24 }}>{body}</main>
  </div>;
}

window.ClipPage = ClipPage;
})();
