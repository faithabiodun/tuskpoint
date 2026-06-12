import { proxy } from "../../../../_proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await params;
  return proxy(
    `/thread/${encodeURIComponent(id)}/checkpoint/${encodeURIComponent(cid)}`,
  );
}
