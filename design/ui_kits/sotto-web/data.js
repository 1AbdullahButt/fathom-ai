// Seed data for the Sotto web UI kit. One fully-seeded meeting (q3): 1:02:18, 8 speakers.
(() => {
const SPEAKERS = [
  { id: 1, name: 'Maya Lindqvist', short: 'Maya', role: 'Head of Product' },
  { id: 2, name: 'Dana Okafor', short: 'Dana', role: 'Engineering lead' },
  { id: 3, name: 'Priya Raman', short: 'Priya', role: 'Growth & pricing' },
  { id: 4, name: 'Leo Brandt', short: 'Leo', role: 'Marketing' },
  { id: 5, name: 'Sam Ito', short: 'Sam', role: 'Design' },
  { id: 6, name: 'Rosa Vidal', short: 'Rosa', role: 'Customer success' },
  { id: 7, name: 'Theo Marsh', short: 'Theo', role: 'Data' },
  { id: 8, name: 'Ines Duarte', short: 'Ines', role: 'Finance' }
].map(s => ({ ...s, color: 'var(--spk-' + s.id + ')' }));

const DURATION = 3738;
const RAW = [
[4,1,"Okay, I think that's everyone. Thanks for making time — this is the Q3 roadmap review, and we've got a full hour, so let's keep moving."],
[22,1,"Agenda: quick Q2 recap, then the beta date, export reliability, pricing, launch messaging, and hiring at the end."],
[41,8,"Can we make sure pricing doesn't get squeezed again? We pushed it last time."],
[52,1,"Yes — pricing gets a hard twenty minutes. Theo, do you want to start with the numbers?"],
[64,7,"Sure. Give me a second to share."],
[120,5,"While Theo's sharing — I posted the new clip-sharing mocks in the channel if anyone wants to look ahead."],
[150,1,"Thanks Sam. We'll get to those under launch."],
[244,7,"So, Q2. Weekly active teams grew about eighteen percent, which is ahead of plan."],
[281,7,"Uploads are now forty-one percent of all new meetings. That's up from twelve at the start of the quarter."],
[318,6,"That matches what I'm hearing. A lot of customers have recordings from tools they already use and just want the notes."],
[352,2,"It's also where most of our failures are. Uploads over an hour fail at roughly three times the rate of short ones."],
[401,7,"Right, I have that broken out. It's mostly files over two gigabytes."],
[455,1,"Okay. Let's hold that for the reliability section."],
[492,3,"One more number — trial to paid is flat at nine percent. I don't love that."],
[540,8,"Flat while usage grows means we're giving too much away on the free plan."],
[610,3,"Maybe. Or the paid plan isn't clearly better. I want to look at both."],
[688,4,"From the marketing side, the top search term bringing people in is literally 'meeting notes without a bot'."],
[742,1,"That's the whole positioning, honestly. Let's remember that for launch."],
[810,6,"Customers say the same thing on calls. People don't want a stranger sitting in their meetings."],
[904,1,"Beta. Dana, where are we?"],
[921,2,"Clip sharing works end to end. Public links open without login, and they play just the selected range."],
[978,2,"What's not done is the export fixes. If we ship before those land, long uploads will keep failing."],
[1040,5,"Design is done for the clip page. I'd still like one more pass on phone."],
[1102,1,"What's the earliest realistic date?"],
[1160,2,"Honestly it depends on scope. A full public beta, end of month at the earliest."],
[1236,6,"Could we start smaller? I have twenty design partners who'd tolerate rough edges."],
[1300,1,"I like that. Partners first, public waitlist after."],
[1355,8,"Does a smaller beta change the cost picture? Transcription minutes aren't free."],
[1384,2,"Barely. Twenty teams is noise."],
[1421,2,"If we hold it to twenty design partners, we can ship on the fourteenth."],
[1468,1,"Great — so beta on the fourteenth, design partners only. Let's write that down as decided."],
[1502,4,"Someone should get the invite out to partners this week."],
[1530,6,"I can probably do that, but let me check with Maya on the list first."],
[1564,2,"Reliability. The core problem is we process uploads in one pass, so big files time out."],
[1622,2,"The fix is chunked processing. We split the audio into ten-minute pieces and transcribe them in parallel."],
[1700,7,"That should also cut processing time for an hour-long file roughly in half."],
[1758,5,"Can the progress bar reflect chunks? Right now it sits at zero for ages and people think it's broken."],
[1811,2,"Yes, we'll report progress per chunk."],
[1860,1,"What about speaker labels across chunks? I don't want speaker three becoming speaker five halfway through."],
[1915,2,"That's the risk. We'll need a reconciliation pass. I'd call it medium confidence for the fourteenth."],
[1990,7,"I can pull the twenty longest failed uploads so we have a real test set."],
[2052,2,"That would help a lot. By Friday if possible."],
[2105,1,"Okay — Theo on the test set, Dana owns chunking."],
[2164,3,"Pricing. I'm proposing three tiers: Free, Team, and Business."],
[2230,3,"Free keeps unlimited recording but caps uploads at five hours a month."],
[2301,8,"I'd rather cap at three hours. Five is generous given processing costs."],
[2366,3,"Three might kill the upload habit we just watched grow."],
[2430,6,"From support — the people uploading are the ones who convert. I'd be careful there."],
[2498,1,"Let's not decide the cap today. Priya and Ines, can you bring a model with both options?"],
[2560,8,"Sure. We can have something by the end of next week, maybe."],
[2622,3,"Team at twelve dollars per seat. Business adds SSO and longer retention."],
[2690,4,"Twelve feels right. Fourteen if we bundle public clips with custom domains."],
[2760,1,"Park the custom domain idea. Twelve is the working number."],
[2824,4,"Launch. The headline I keep coming back to is 'Your meetings, without the bot.'"],
[2880,5,"I'd lead with the clip page in the visuals. It's the most shareable thing we have."],
[2944,6,"And trust. Every summary point links to the quote it came from. That's what customers mention."],
[3010,4,"Good — 'every claim, one click from its quote' could be the second line."],
[3071,1,"I like both. Leo, draft the launch post and we'll review it together."],
[3130,4,"Will do. I'll aim for before the beta."],
[3188,5,"I'll have phone mocks of the clip page so Leo can use them."],
[3304,1,"Last thing: hiring. We have approval for one more engineer."],
[3352,2,"Backend, ideally someone who has built media pipelines."],
[3410,8,"Budget is approved through Q4, so there's no rush to close it in a week."],
[3470,1,"Dana, can you write the job description?"],
[3501,2,"Yes, I'll have a draft next Tuesday."],
[3560,1,"Quick recap: beta on the fourteenth for design partners, chunked uploads, pricing model next week, launch post from Leo."],
[3640,6,"And the partner invite — we still need to confirm who sends it."],
[3672,1,"Right. Let's sort that offline. Thanks, everyone."]
];
const LINES = RAW.map(([t, s, text], i) => ({ i, t, end: (RAW[i + 1] ? RAW[i + 1][0] : DURATION), spk: s, text }));
const talk = {};
LINES.forEach(l => { talk[l.spk] = (talk[l.spk] || 0) + Math.min(l.end - l.t, 75); });

const CHAPTERS = [
  { title: 'Kickoff and agenda', seconds: 0 },
  { title: 'Q2 recap and metrics', seconds: 240 },
  { title: 'Beta scope and date', seconds: 900 },
  { title: 'Upload reliability', seconds: 1560 },
  { title: 'Pricing tiers', seconds: 2160 },
  { title: 'Launch messaging', seconds: 2820 },
  { title: 'Hiring and next steps', seconds: 3300 }
];

// q = transcript line time the claim is grounded in
const TEMPLATES = {
  'General': [
    { h: 'Key points', pts: [
      { id: 'g1', text: 'Q2 weekly active teams grew about 18%; uploads are now 41% of new meetings, up from 12%.', q: 281 },
      { id: 'g2', text: 'Beta ships on the 14th, limited to 20 design partners. A public waitlist comes after.', q: 1468, edited: { by: 'Maya', at: '2 hours ago' }, editedText: 'Beta ships the 14th to 20 design partners only — no public waitlist until the upload fixes land.' },
      { id: 'g3', text: 'Uploads over an hour fail about 3× as often as short ones. The fix is chunked processing in 10-minute pieces.', q: 1622 },
      { id: 'g4', text: 'Speaker labels may drift between chunks; Dana rated the 14th as medium confidence.', q: 1915 },
      { id: 'g5', text: 'Flat trial-to-paid (9%) is likely caused by an overly generous free plan.', q: 540, conf: 'low', why: 'speakers disagreed' },
      { id: 'g6', text: 'Team tier is $12 per seat as a working number; the free upload cap (3 vs 5 hours) is undecided.', q: 2760 },
      { id: 'g7', text: 'Launch positioning: “Your meetings, without the bot.”', q: 2824 },
      { id: 'g8', text: 'One backend engineer is approved, with budget through Q4.', q: 3304 }
    ] }
  ],
  'Decisions & risks': [
    { h: 'Decided', pts: [
      { id: 'd1', text: 'Beta on the 14th, design partners only.', q: 1468 },
      { id: 'd2', text: 'Uploads move to chunked processing; Dana owns it.', q: 2105 },
      { id: 'd3', text: '$12 per seat is the working Team price; custom domains parked.', q: 2760 }
    ] },
    { h: 'Open questions', pts: [
      { id: 'd4', text: 'Free-plan upload cap: 3 or 5 hours a month.', q: 2498 },
      { id: 'd5', text: 'Who sends the design-partner invite.', q: 3640, conf: 'low', why: 'Rosa offered, not confirmed' }
    ] },
    { h: 'Risks', pts: [
      { id: 'd6', text: 'Speaker labels could change between chunks without a reconciliation pass.', q: 1915 },
      { id: 'd7', text: 'Shipping before upload fixes means long uploads keep failing.', q: 978 }
    ] }
  ],
  'Brief': [
    { h: 'In three lines', pts: [
      { id: 'b1', text: 'Beta: the 14th, 20 design partners.', q: 1421 },
      { id: 'b2', text: 'Reliability: chunk long uploads; test on the 20 worst failures.', q: 1990 },
      { id: 'b3', text: 'Pricing model with both upload caps due next week.', q: 2560, conf: 'low', why: '“maybe” on timing' }
    ] }
  ]
};

const ACTIONS = [
  { id: 'a1', text: 'Send the beta invite to design partners', owner: null, due: 'This week', conf: 'low', why: 'Rosa offered tentatively', q: 1530 },
  { id: 'a2', text: 'Ship chunked upload processing with per-chunk progress', owner: 2, due: 'The 14th', q: 2105 },
  { id: 'a3', text: 'Pull the 20 longest failed uploads as a test set', owner: 7, due: 'Friday', q: 2052 },
  { id: 'a4', text: 'Bring a pricing model with 3- and 5-hour upload caps', owner: 3, due: 'End of next week', conf: 'low', why: '“maybe” on timing', q: 2560 },
  { id: 'a5', text: 'Draft the launch post', editedText: 'Draft the launch post — lead with “Your meetings, without the bot.”', edited: { by: 'Maya', at: '2 hours ago' }, owner: 4, due: 'Before beta', q: 3071 },
  { id: 'a6', text: 'Make phone mocks of the clip page', owner: 5, due: null, q: 3188 },
  { id: 'a7', text: 'Write the backend engineer job description', owner: 2, due: 'Next Tuesday', q: 3501, done: true }
];

const HIGHLIGHTS = [
  { id: 'beta-date', title: 'Beta date agreed', start: 1415, end: 1490, spk: 2, q: 1421, author: 'Maya Lindqvist' },
  { id: 'uploads-41', title: 'Why uploads matter', start: 278, end: 352, spk: 7, q: 281, author: 'Leo Brandt' },
  { id: 'positioning', title: 'Positioning line', start: 2820, end: 2880, spk: 4, q: 2824, author: 'Leo Brandt' }
];

const P = SPEAKERS;
const MEETINGS = [
  { id: 'northwind', title: 'Customer call — Northwind', date: 'Just now', group: 'Today', source: 'upload', media: 'video', speakers: [P[5], P[2]], status: 'processing', progress: 64 },
  { id: 'q3', title: 'Q3 roadmap review', date: 'Today, 10:00', group: 'Today', duration: DURATION, source: 'upload', media: 'video', speakers: P, text: RAW.map(r => r[2]).join(' ') },
  { id: 'crit', title: 'Design crit — clip sharing', date: 'Yesterday, 15:30', group: 'Yesterday', duration: 1840, source: 'recording', media: 'audio', speakers: [P[4], P[0], P[3]], text: 'the clip page should show the transcript under the player and keep the range obvious on phone' },
  { id: 'eng', title: 'Weekly eng sync', date: 'Yesterday, 09:00', group: 'Yesterday', duration: 2210, source: 'recording', media: 'audio', speakers: [P[1], P[6], P[0]], text: 'chunked processing spike looks good, reconciliation pass for speaker labels is the open risk' },
  { id: 'halcyon', title: 'Partner interview — Halcyon', date: 'Wed, Oct 21', group: 'This week', duration: 2685, source: 'upload', media: 'video', speakers: [P[5], P[0]], text: 'we upload our sales calls from the conferencing tool and only want the action items and pricing questions' },
  { id: 'pricing', title: 'Pricing workshop', date: 'Tue, Oct 20', group: 'This week', duration: 5420, source: 'recording', media: 'video', speakers: [P[2], P[7], P[0], P[3]], text: 'free plan upload cap, team seat price, business tier with SSO and retention' },
  { id: 'oneonone', title: '1:1 Maya / Dana', date: 'Mon, Oct 19', group: 'This week', duration: 1512, source: 'recording', media: 'audio', speakers: [P[0], P[1]], text: 'hiring a backend engineer with media pipeline experience' },
  { id: 'board', title: 'board-sync.mov', date: 'Oct 16', group: 'Earlier in October', source: 'upload', media: 'video', speakers: [], status: 'failed' },
  { id: 'allhands', title: 'All-hands — October', date: 'Oct 9', group: 'Earlier in October', duration: 3120, source: 'upload', media: 'video', speakers: P, text: 'company update, beta timeline, and a demo of public clip links' }
];

window.SOTTO_DATA = { SPEAKERS, DURATION, LINES, CHAPTERS, TEMPLATES, ACTIONS, HIGHLIGHTS, MEETINGS, TALK: talk,
  MEETING: { id: 'q3', title: 'Q3 roadmap review', date: 'Sat, Oct 24, 2026 · 10:00', source: 'upload' } };
})();
