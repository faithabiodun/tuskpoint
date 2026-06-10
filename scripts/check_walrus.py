"""Step 1 proof: write a blob to Walrus testnet, read it back, verify identity.

Run:

    python scripts/check_walrus.py

It generates random bytes, ``PUT``s them to a testnet *publisher*, extracts the
returned blob ID, ``GET``s the blob back from an *aggregator*, and asserts the
round-tripped bytes are byte-identical to what we sent. Publisher/aggregator
base URLs come from the environment (``WALRUS_PUBLISHER_URL`` /
``WALRUS_AGGREGATOR_URL``) with sensible public-testnet fallbacks, and each
request is retried once against an alternate node on failure.
"""

from __future__ import annotations

import os
import sys
import secrets

import httpx
from dotenv import load_dotenv

load_dotenv()

# Public testnet fallbacks (the env vars take precedence if set). The first
# entry of each list is the canonical Mysten-operated node.
DEFAULT_PUBLISHERS = [
    "https://publisher.walrus-testnet.walrus.space",
    "https://walrus-testnet-publisher.nodes.guru",
    "https://walrus-testnet-publisher.stakely.io",
]
DEFAULT_AGGREGATORS = [
    "https://aggregator.walrus-testnet.walrus.space",
    "https://walrus-testnet-aggregator.nodes.guru",
    "https://walrus-testnet-aggregator.stakely.io",
]

# Store the blob for a few epochs so the aggregator has time to serve it.
EPOCHS = 5
HTTP_TIMEOUT = httpx.Timeout(60.0)


def _publishers() -> list[str]:
    """Return the ordered list of publisher base URLs to try."""
    env = os.getenv("WALRUS_PUBLISHER_URL")
    if env:
        # Put the configured node first, then fall back to the public list.
        return [env] + [u for u in DEFAULT_PUBLISHERS if u != env]
    return DEFAULT_PUBLISHERS


def _aggregators() -> list[str]:
    """Return the ordered list of aggregator base URLs to try."""
    env = os.getenv("WALRUS_AGGREGATOR_URL")
    if env:
        return [env] + [u for u in DEFAULT_AGGREGATORS if u != env]
    return DEFAULT_AGGREGATORS


def store_blob(data: bytes) -> str:
    """Store ``data`` as a Walrus blob and return its blob ID.

    Tries each publisher in turn (env-configured first), giving one retry's
    worth of resilience against flaky public nodes. Raises ``RuntimeError`` if
    every publisher fails.
    """
    last_error: Exception | None = None
    for base in _publishers():
        url = f"{base.rstrip('/')}/v1/blobs"
        try:
            with httpx.Client(timeout=HTTP_TIMEOUT) as client:
                resp = client.put(url, params={"epochs": EPOCHS}, content=data)
                resp.raise_for_status()
                body = resp.json()
        except Exception as exc:  # noqa: BLE001 - report and try next node
            last_error = exc
            print(f"  [publisher] {base} failed: {exc}")
            continue

        blob_id = _extract_blob_id(body)
        if blob_id:
            print(f"  [publisher] stored via {base}")
            return blob_id
        last_error = RuntimeError(f"unexpected response shape: {body}")
        print(f"  [publisher] {base} returned no blobId: {body}")

    raise RuntimeError(f"all publishers failed; last error: {last_error}")


def _extract_blob_id(body: dict) -> str | None:
    """Pull the blob ID out of a publisher response (new or already-certified)."""
    if "newlyCreated" in body:
        return body["newlyCreated"]["blobObject"]["blobId"]
    if "alreadyCertified" in body:
        return body["alreadyCertified"]["blobId"]
    return None


def read_blob(blob_id: str) -> bytes:
    """Fetch a Walrus blob by ID, trying each aggregator once.

    Raises ``RuntimeError`` if every aggregator fails.
    """
    last_error: Exception | None = None
    for base in _aggregators():
        url = f"{base.rstrip('/')}/v1/blobs/{blob_id}"
        try:
            with httpx.Client(timeout=HTTP_TIMEOUT) as client:
                resp = client.get(url)
                resp.raise_for_status()
                print(f"  [aggregator] read via {base}")
                return resp.content
        except Exception as exc:  # noqa: BLE001 - report and try next node
            last_error = exc
            print(f"  [aggregator] {base} failed: {exc}")
            continue

    raise RuntimeError(f"all aggregators failed; last error: {last_error}")


def main() -> int:
    """Run the round-trip proof; return process exit code."""
    payload = b"tuskpoint-walrus-check::" + secrets.token_bytes(64)
    print(f"Generated {len(payload)} random bytes.")

    print("Storing blob on Walrus testnet...")
    blob_id = store_blob(payload)
    print(f"  blob ID: {blob_id}")

    print("Reading blob back from Walrus testnet...")
    fetched = read_blob(blob_id)

    if fetched == payload:
        print("\nSUCCESS: round-tripped bytes are byte-identical.")
        print(f"blob_id={blob_id}")
        return 0

    print("\nFAILURE: bytes differ!")
    print(f"  sent {len(payload)} bytes, got {len(fetched)} bytes")
    return 1


if __name__ == "__main__":
    sys.exit(main())
