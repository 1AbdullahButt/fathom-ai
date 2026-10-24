Text field; with icon="search" it is the meetings/transcript search.

```jsx
<Input icon="search" placeholder="Search meetings and transcripts" shortcut="/" value={q} onChange={e=>setQ(e.target.value)} onClear={()=>setQ("")} />
```
