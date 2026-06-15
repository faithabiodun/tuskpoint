// Typed client for the live TuskPoint engine, via same-origin /api/* routes.
// Every call hits the real Walrus-backed service, no mock data.

export type Health = {
  ok: boolean;
  backend: string;
  memwal: boolean;
  network: string;
  seed_thread: string;
};

export type CheckpointMeta = {
  checkpoint_id: string;
  blob_id: string;
  parent_checkpoint_id: string | null;
  timestamp: string;
  summary: string;
  forked_from: string | null;
};

export type ThreadList = {
  thread_id: string;
  count: number;
  checkpoints: CheckpointMeta[];
};

export type LoadedState = {
  thread_id: string;
  checkpoint_id: string;
  state: Record<string, unknown> | null;
};

export type DiffResult = {
  thread_id: string;
  id_a: string;
  id_b: string;
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  changed: Record<string, { from: unknown; to: unknown }>;
  human_readable: string;
};

export type SearchResult = {
  query: string;
  results: { text: string; distance: number }[];
};

export type SaveResult = {
  thread_id: string;
  checkpoint_id: string;
  blob_id: string | null;
};

export type ForkResult = {
  source: string;
  new_thread_id: string;
  checkpoint_id: string;
  blob_id: string;
  forked_from: string;
};

export type VerifyStatus = "PASS" | "FAIL" | "UNVERIFIED";

export type VerifyStep = {
  checkpoint_id: string;
  blob_id: string;
  stored_hash: string | null;
  recomputed_hash: string | null;
  status: VerifyStatus;
};

export type VerifyResult = {
  thread_id: string;
  ok: boolean;
  checkpoint_count: number;
  verified: number;
  tampered_count: number;
  steps: VerifyStep[];
};

export type RollbackResult = {
  thread_id: string;
  checkpoint_id: string;
  restored_from: string;
  blob_id: string;
  rolled_back_from: string;
};

export type HandoffDescriptor = {
  source: string;
  thread_id: string;
  checkpoint_id: string;
  blob_id: string;
  blob_sha256: string | null;
  to_agent: string | null;
  summary: string;
};

export type AdoptResult = {
  adopted_from: string;
  new_thread_id: string;
  checkpoint_id: string;
  blob_id: string;
  verified: boolean;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && (data.error || data.detail)) ||
      `Request failed (${res.status})`;
    throw new ApiError(typeof msg === "string" ? msg : JSON.stringify(msg), res.status);
  }
  return data as T;
}

export const api = {
  health: () => call<Health>("/api/health"),
  listThread: (id: string) =>
    call<ThreadList>(`/api/thread/${encodeURIComponent(id)}`),
  loadCheckpoint: (id: string, cid: string) =>
    call<LoadedState>(
      `/api/thread/${encodeURIComponent(id)}/checkpoint/${encodeURIComponent(cid)}`,
    ),
  diff: (id: string, id_a: string, id_b: string) =>
    call<DiffResult>(`/api/thread/${encodeURIComponent(id)}/diff`, {
      method: "POST",
      body: JSON.stringify({ id_a, id_b }),
    }),
  search: (query: string) =>
    call<SearchResult>("/api/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  save: (id: string, state: Record<string, unknown>) =>
    call<SaveResult>(`/api/thread/${encodeURIComponent(id)}/save`, {
      method: "POST",
      body: JSON.stringify({ state }),
    }),
  fork: (
    source_thread_id: string,
    source_checkpoint_id: string,
    new_thread_id: string,
  ) =>
    call<ForkResult>("/api/fork", {
      method: "POST",
      body: JSON.stringify({
        source_thread_id,
        source_checkpoint_id,
        new_thread_id,
      }),
    }),
  verify: (id: string) =>
    call<VerifyResult>(`/api/thread/${encodeURIComponent(id)}/verify`),
  rollback: (id: string, checkpoint_id: string) =>
    call<RollbackResult>(`/api/thread/${encodeURIComponent(id)}/rollback`, {
      method: "POST",
      body: JSON.stringify({ checkpoint_id }),
    }),
  handoff: (id: string, checkpoint_id: string, to_agent?: string) =>
    call<HandoffDescriptor>(`/api/thread/${encodeURIComponent(id)}/handoff`, {
      method: "POST",
      body: JSON.stringify({ checkpoint_id, to_agent: to_agent ?? null }),
    }),
  adopt: (handoff: HandoffDescriptor, new_thread_id: string) =>
    call<AdoptResult>("/api/adopt", {
      method: "POST",
      body: JSON.stringify({ handoff, new_thread_id }),
    }),
};

// Default aggregator for clickable blob evidence links. The live demo runs on
// Walrus testnet (free writes), so this points at the testnet aggregator. When
// an operator points the engine at mainnet, /health reports network="mainnet"
// and the UI swaps to the mainnet aggregator via aggregatorFor() below.
export const EVIDENCE_AGGREGATOR =
  "https://aggregator.walrus-testnet.walrus.space/v1/blobs/";

const AGGREGATORS: Record<string, string> = {
  testnet: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/",
  mainnet: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/",
};

// Resolve the correct Walrus aggregator base for a given network label so blob
// links always resolve where the engine actually wrote them.
export function aggregatorFor(network?: string): string {
  return AGGREGATORS[network ?? ""] ?? EVIDENCE_AGGREGATOR;
}
