// Memory mode only (tests/e2e/CI): the local stand-in for a Storage signed upload URL.
// PUT stores the bytes in process memory; GET serves them (with Range, so the player can seek).
import { NextResponse } from "next/server";
import { dataSource } from "@/lib/data";
import { getMemoryFile, putMemoryFile } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  if (dataSource() !== "memory") return NextResponse.json({ error: "not found" }, { status: 404 });
  const { id } = await params;
  const bytes = Buffer.from(await req.arrayBuffer());
  const r = putMemoryFile(id, bytes);
  if (r === "unknown") return NextResponse.json({ error: "no upload reserved for this id" }, { status: 404 });
  if (r === "too_large") return NextResponse.json({ error: "file larger than announced" }, { status: 413 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request, { params }: Ctx) {
  if (dataSource() !== "memory") return NextResponse.json({ error: "not found" }, { status: 404 });
  const { id } = await params;
  const f = getMemoryFile(id);
  if (!f) return NextResponse.json({ error: "not found" }, { status: 404 });
  const total = f.bytes.length;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (start >= total || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    }
    return new Response(new Uint8Array(f.bytes.subarray(start, end + 1)), {
      status: 206,
      headers: {
        "Content-Type": f.type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
      },
    });
  }
  return new Response(new Uint8Array(f.bytes), {
    headers: { "Content-Type": f.type, "Content-Length": String(total), "Accept-Ranges": "bytes" },
  });
}
