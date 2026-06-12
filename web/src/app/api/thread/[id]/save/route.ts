import { proxy } from "../../../_proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return proxy(`/thread/${encodeURIComponent(id)}/save`, {
    method: "POST",
    body,
  });
}
