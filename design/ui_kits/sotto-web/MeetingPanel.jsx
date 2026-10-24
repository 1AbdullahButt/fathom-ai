(() => {
const { useState } = React;
const { Button, Select, Tabs, SummaryPoint, ActionItem, HighlightCard, StateBlock, Skeleton, Dialog, Input, Icon } = window.SottoDesignSystem_5b0428;
const D = window.SOTTO_DATA;
const spk = id => D.SPEAKERS.find(s => s.id === id);
const lineAt = t => D.LINES.find(l => l.t === t);
const quoteOf = t => { const l = lineAt(t); const s = spk(l.spk); return { speaker: s.name, color: s.color, seconds: l.t, text: l.text }; };

function Legend() {
  const item = (sw, label) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{sw}{label}</span>;
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', font: '400 12px/1.3 var(--font-sans)', color: 'var(--text-muted)' }}>
    {item(<span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--text-1)' }}>Aa</span>, 'AI-written')}
    {item(<span style={{ font: '400 15px/1 var(--font-serif)', color: 'var(--human-text)' }}>Aa</span>, 'Edited by a person')}
    {item(<span style={{ color: 'var(--warn-mark)', display: 'inline-flex' }}><Icon name="triangle-alert" size={13} strokeWidth={2} /></span>, 'Check the quote')}
  </div>;
}

function SectionHead({ children, right }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 14 }}>
    <h3 style={{ margin: 0, font: 'var(--type-overline)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{children}</h3>{right}
  </div>;
}

function SummaryTab({ jump, activeT }) {
  const [tpl, setTpl] = useState('General');
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState({});
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const change = v => { setTpl(v); setBusy(true); setTimeout(() => setBusy(false), 700); };
  return <div style={{ display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 14 }}>
      <Select size="sm" label="Template" icon="layout-template" value={tpl} onChange={change} options={Object.keys(D.TEMPLATES)} />
    </div>
    <div style={{ marginTop: 12 }}><Legend /></div>
    {busy ? <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 22 }}>{[0, 1, 2].map(i => <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Skeleton lines={2} height={11} /><Skeleton height={44} radius="var(--radius-sm)" /></div>)}</div> :
      D.TEMPLATES[tpl].map(sec => <div key={sec.h}>
        <SectionHead>{sec.h}</SectionHead>
        {sec.pts.map(p => {
          const e = edits[p.id] || (p.edited ? { by: p.edited.by, at: p.edited.at, text: p.editedText } : null);
          if (editing === p.id) return <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0' }}>
            <textarea autoFocus value={draft} onChange={ev => setDraft(ev.target.value)} rows={3} style={{ width: '100%', resize: 'vertical', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-focus)', boxShadow: 'var(--ring-focus)', font: 'var(--type-human)', color: 'var(--human-text)', background: 'var(--surface-card)', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {e ? <Button size="sm" variant="ghost" icon="undo-2" onClick={() => { setEdits(x => ({ ...x, [p.id]: undefined })); if (p.edited) p.edited = null; setEditing(null); }}>Restore AI text</Button> : null}
              <Button size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={() => { setEdits(x => ({ ...x, [p.id]: { by: 'You', at: 'just now', text: draft } })); setEditing(null); }}>Save</Button>
            </div>
          </div>;
          return <SummaryPoint key={p.id} text={e ? e.text : p.text} edited={e ? { by: e.by, at: e.at } : undefined} confidence={p.conf} lowReason={p.why} quote={quoteOf(p.q)} onJump={jump} active={activeT === p.q}
            onEdit={() => { setDraft(e ? e.text : p.text); setEditing(p.id); }} />;
        })}
      </div>)}
  </div>;
}

function ActionsTab({ jump, activeT, empty }) {
  const [done, setDone] = useState(() => Object.fromEntries(D.ACTIONS.map(a => [a.id, !!a.done])));
  if (empty) return <StateBlock compact kind="empty" icon="list-checks" title="No action items were said" body="Nobody committed to a task out loud in this meeting, so we didn’t invent any." />;
  const review = D.ACTIONS.filter(a => a.conf === 'low').length;
  const missing = D.ACTIONS.filter(a => !a.owner || !a.due).length;
  return <div style={{ display: 'flex', flexDirection: 'column' }}>
    <p style={{ margin: '14px 0 4px', font: '400 13px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>{D.ACTIONS.length} items · {review} to check · {missing} missing an owner or date</p>
    {D.ACTIONS.map((a, i) => <div key={a.id} style={{ borderTop: i ? '1px solid var(--line-1)' : 0 }}>
      <ActionItem text={a.edited ? a.editedText : a.text} edited={a.edited} owner={a.owner ? spk(a.owner) : null} due={a.due} done={done[a.id]} onToggle={v => setDone(x => ({ ...x, [a.id]: v }))}
        confidence={a.conf} lowReason={a.why} quote={quoteOf(a.q)} onJump={jump} active={activeT === a.q} />
    </div>)}
  </div>;
}

function ClipDialog({ t, onClose, onCreate }) {
  const s0 = Math.max(0, Math.floor(t) - 10), e0 = Math.min(D.DURATION, s0 + 45);
  const [title, setTitle] = useState('');
  return <Dialog title="Clip this moment" description={'Plays ' + window.fmtTime(s0) + '–' + window.fmtTime(e0) + ' with its transcript. Anyone with the link can watch — no sign-in.'} onClose={onClose}
    footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon="link" onClick={() => onCreate({ id: 'c' + Date.now(), title: title || 'Clip at ' + window.fmtTime(s0), start: s0, end: e0, spk: (D.LINES.filter(l => l.t <= t).pop() || D.LINES[0]).spk, q: (D.LINES.filter(l => l.t <= t).pop() || D.LINES[0]).t, author: 'You' })}>Create and copy link</Button></>}>
    <Input autoFocus placeholder="Clip title" value={title} onChange={e => setTitle(e.target.value)} />
  </Dialog>;
}

function HighlightsTab({ jump, t, clips, setClips, toast, go, empty }) {
  const [dlg, setDlg] = useState(false);
  const list = empty ? [] : clips;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14 }}>
    <Button icon="scissors" onClick={() => setDlg(true)}>Clip from {window.fmtTime(t)}</Button>
    {!list.length ? <StateBlock compact kind="empty" icon="bookmark" title="No highlights yet" body="Clip a moment while you listen. Each clip gets a public link that plays just that range." /> :
      list.map(h => { const l = lineAt(h.q); const s = spk(h.spk); return <HighlightCard key={h.id} title={h.title} start={h.start} end={h.end} speaker={s.short} color={s.color} text={l.text} author={h.author} active={t >= h.start && t < h.end}
        onPlay={jump} onShare={() => toast('Public clip link copied', 'link', 'Open', () => go('#/c/' + h.id))} />; })}
    {dlg ? <ClipDialog t={t} onClose={() => setDlg(false)} onCreate={c => { setClips(x => [c, ...x]); setDlg(false); toast('Clip created · link copied', 'link', 'Open', () => go('#/c/' + c.id)); }} /> : null}
  </div>;
}

function PanelSkeleton() {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 18 }}><Skeleton width={180} height={28} radius="var(--radius-sm)" />{[0, 1, 2, 3].map(i => <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Skeleton lines={2} height={11} /><Skeleton height={48} radius="var(--radius-sm)" /></div>)}</div>;
}

function SidePanel({ state, tab, setTab, hideTabs, ...p }) {
  const tabs = [{ id: 'summary', label: 'Summary' }, { id: 'actions', label: 'Action items', count: state === 'empty' ? 0 : D.ACTIONS.length }, { id: 'highlights', label: 'Highlights', count: state === 'empty' ? 0 : p.clips.length }];
  let content;
  if (state === 'loading') content = <PanelSkeleton />;
  else if (state === 'processing') content = <StateBlock compact kind="processing" loading title="Notes are on their way" body="The summary, action items and quotes appear once the transcript is ready — usually a few minutes for an hour of audio." />;
  else if (tab === 'summary') content = <SummaryTab jump={p.jump} activeT={p.activeT} />;
  else if (tab === 'actions') content = <ActionsTab jump={p.jump} activeT={p.activeT} empty={state === 'empty'} />;
  else content = <HighlightsTab {...p} empty={state === 'empty'} />;
  return <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
    {!hideTabs ? <div style={{ padding: '0 20px', flexShrink: 0 }}><Tabs value={tab} onChange={setTab} tabs={tabs} /></div> : null}
    <div style={{ flex: 1, overflowY: 'auto', padding: hideTabs ? '0 16px 96px' : '0 20px 96px' }}>{content}</div>
  </div>;
}

Object.assign(window, { SidePanel });
})();
