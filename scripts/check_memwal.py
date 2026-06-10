"""Step 2 proof: authenticate to MemWal staging, remember a fact, recall it.

Run:

    python scripts/check_memwal.py

It builds a MemWal client from ``MEMWAL_PRIVATE_KEY`` / ``MEMWAL_ACCOUNT_ID``
(env, ``staging`` preset), checks relayer health, stores a uniquely-tagged
sentence with ``remember_and_wait`` (blocks until persisted), then runs a
``recall`` for that tag and confirms the stored sentence comes back. This
proves the semantic layer end-to-end before we wire it into the saver.
"""

from __future__ import annotations

import os
import sys
import asyncio
import secrets

from dotenv import load_dotenv

load_dotenv()

# Unique per-run namespace + tag so repeated runs don't collide and recall is
# unambiguous on staging shared infrastructure.
RUN_TAG = secrets.token_hex(4)
NAMESPACE = f"tuskpoint-check-{RUN_TAG}"


async def run() -> int:
    """Execute the MemWal round-trip proof; return a process exit code."""
    from memwal import MemWal, RecallParams

    key = os.getenv("MEMWAL_PRIVATE_KEY")
    account_id = os.getenv("MEMWAL_ACCOUNT_ID")
    if not key or not account_id:
        print(
            "ERROR: set MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID in .env first.\n"
            "Copy .env.example to .env and fill in your staging credentials."
        )
        return 2

    env = os.getenv("MEMWAL_ENV", "prod")
    print(f"Connecting to MemWal (env={env}, namespace={NAMESPACE})...")
    memwal = MemWal.create(
        key=key,
        account_id=account_id,
        env=env,
        namespace=NAMESPACE,
    )

    print("Checking relayer health...")
    health = await memwal.health()
    print(f"  health: {health}")

    sentence = (
        f"TuskPoint check {RUN_TAG}: the writer node started after the "
        f"researcher node finished gathering sources."
    )
    print(f"Remembering: {sentence!r}")
    remembered = await memwal.remember_and_wait(sentence)
    print(f"  stored blob_id: {remembered.blob_id}")

    query = f"When did the writer node start in run {RUN_TAG}?"
    print(f"Recalling with query: {query!r}")
    result = await memwal.recall(RecallParams(query=query, limit=5))

    print(f"  got {result.total} result(s):")
    found = False
    for hit in result.results:
        print(f"    [distance={hit.distance:.4f}] {hit.text}")
        if RUN_TAG in hit.text:
            found = True

    if found:
        print("\nSUCCESS: stored memory was recalled semantically.")
        return 0

    print(
        "\nFAILURE: the stored sentence was not found in recall results.\n"
        "(It may still be indexing; try re-running.)"
    )
    return 1


def main() -> int:
    """Entry point wrapping the async proof."""
    try:
        return asyncio.run(run())
    except Exception as exc:  # noqa: BLE001 - surface a clear top-level error
        print(f"\nERROR: {type(exc).__name__}: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
