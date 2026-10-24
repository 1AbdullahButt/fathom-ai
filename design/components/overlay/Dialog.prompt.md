Modal for focused tasks (create clip, upload, confirm delete). Esc + backdrop close.

```jsx
<Dialog title="Share clip" onClose={close} footer={<Button variant="primary">Copy link</Button>}>…</Dialog>
```

`inline` renders the card without overlay (docs/cards).
