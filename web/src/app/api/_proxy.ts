// Server-side proxy to the TuskPoint FastAPI engine.
//
// Secrets (the service URL + token) live in server env only and never reach the
// browser. Route handlers call `proxy()` so the dashboard can hit same-origin
// `/api/*` paths while we forward to the real engine.

import { NextResponse } from "next/server";

const API_URL = process.env.TUSKPOINT_API_URL;
const API_TOKEN = process.env.TUSKPOINT_API_TOKEN ?? "";

export type ProxyInit = {
  method?: "GET" | "POST";
  body?: unknown;
};

/**
 * Forward a request to the FastAPI engine and return its JSON as a Next response.
 * On any failure (missing config, network, upstream error) returns a clear JSON
 * error — never fabricated data.
 */
export async function proxy(path: string, init: ProxyInit = {}) {
  if (!API_URL) {
    return NextResponse.json(
      {
        error:
          "Live engine not configured. Set TUSKPOINT_API_URL (and TUSKPOINT_API_TOKEN) in the environment.",
      },
      { status: 503 },
    );
  }

  const url = `${API_URL.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(API_TOKEN ? { "x-tuskpoint-token": API_TOKEN } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      // The free-tier engine may cold-start (~30-60s); give it room.
      signal: AbortSignal.timeout(75_000),
      cache: "no-store",
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || "upstream returned non-JSON" };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "TimeoutError"
        ? "The live engine is waking up (free-tier cold start). Try again in a moment."
        : "Could not reach the live engine.";
    return NextResponse.json({ error: msg }, { status: 504 });
  }
}
