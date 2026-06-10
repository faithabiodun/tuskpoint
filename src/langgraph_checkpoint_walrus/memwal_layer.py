"""The *semantic* layer: write one-sentence checkpoint summaries to MemWal.

On every ``WalrusSaver.put`` the saver calls :meth:`MemWalLayer.summarize_and_remember`,
which derives a short natural-language sentence describing what just happened
(which node ran, what changed) and stores it in MemWal. Later, an agent can call
:meth:`MemWalLayer.search_history` to *semantically* search its own past — e.g.
"when did the writer start?" — over those summaries.

This is deliberately separate from the *exact* Walrus layer: MemWal recall is
fuzzy/semantic and is never used to fetch exact state. It only points you at the
right moment in history (by ``thread_id`` / ``checkpoint_id`` embedded in the
summary text), which you then load exactly via the manifest.

Construction reads credentials from the environment; see ``.env.example``.
``MEMWAL_SERVER_URL`` (your dashboard relayer URL) takes precedence over the
``MEMWAL_ENV`` preset when set.
"""

from __future__ import annotations

import os
from typing import Any


class MemWalLayer:
    """Thin wrapper over the MemWal sync SDK for checkpoint summaries + recall.

    Args:
        client: A pre-built ``MemWalSync`` instance. Most callers should use
            :meth:`from_env` instead.
        namespace: Logical namespace memories are written under.
    """

    def __init__(self, client: Any, *, namespace: str = "tuskpoint") -> None:
        self._client = client
        self.namespace = namespace

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    @classmethod
    def from_env(cls) -> "MemWalLayer":
        """Build a :class:`MemWalLayer` from environment variables.

        Requires ``MEMWAL_PRIVATE_KEY`` and ``MEMWAL_ACCOUNT_ID``. Uses
        ``MEMWAL_SERVER_URL`` if set (dashboard relayer URL), otherwise the
        ``MEMWAL_ENV`` preset (default ``prod``). Namespace defaults to
        ``MEMWAL_NAMESPACE`` or ``tuskpoint``.

        Raises:
            RuntimeError: if required credentials are missing.
            ImportError: if the ``memwal`` package is not installed.
        """
        key = os.getenv("MEMWAL_PRIVATE_KEY")
        account_id = os.getenv("MEMWAL_ACCOUNT_ID")
        if not key or not account_id:
            raise RuntimeError(
                "MemWal layer needs MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID "
                "(set them in .env)."
            )

        from memwal import MemWalSync

        namespace = os.getenv("MEMWAL_NAMESPACE", "tuskpoint")
        server_url = os.getenv("MEMWAL_SERVER_URL")
        if server_url:
            client = MemWalSync.create(
                key=key,
                account_id=account_id,
                server_url=server_url,
                namespace=namespace,
            )
        else:
            client = MemWalSync.create(
                key=key,
                account_id=account_id,
                env=os.getenv("MEMWAL_ENV", "prod"),
                namespace=namespace,
            )
        return cls(client, namespace=namespace)

    # ------------------------------------------------------------------
    # Summary generation
    # ------------------------------------------------------------------

    @staticmethod
    def build_summary(
        thread_id: str,
        checkpoint_id: str,
        checkpoint: dict[str, Any],
        metadata: dict[str, Any],
    ) -> str:
        """Compose a one-sentence summary of this checkpoint.

        Uses LangGraph metadata: ``source`` (loop/input/update), ``step``, and
        ``writes`` (the node(s) that produced this checkpoint and their outputs).
        The ``thread_id`` and ``checkpoint_id`` are embedded so a semantic hit can
        be resolved back to exact state.
        """
        source = metadata.get("source", "unknown")
        step = metadata.get("step", "?")
        writes = metadata.get("writes") or {}

        if writes:
            # Best signal when present: metadata names the node(s) that wrote.
            node_names = ", ".join(writes.keys())
            changed_channels: list[str] = []
            for payload in writes.values():
                if isinstance(payload, dict):
                    changed_channels.extend(payload.keys())
            changed = (
                f" updating {', '.join(sorted(set(changed_channels)))}"
                if changed_channels
                else ""
            )
            action = f"node '{node_names}' ran{changed}"
        elif source == "input":
            action = "the graph received its initial input"
        else:
            # Fallback: infer progress from which channels now hold values. This
            # keeps summaries meaningful even when metadata['writes'] is empty at
            # write time (LangGraph populates it post-checkpoint in some versions).
            channels = checkpoint.get("channel_values", {}) or {}
            present = [k for k, v in channels.items() if v not in (None, "", [], {})]
            if present:
                action = (
                    f"state advanced (step {step}); "
                    f"channels now set: {', '.join(sorted(present))}"
                )
            else:
                action = f"a '{source}' checkpoint was recorded"

        return (
            f"[thread={thread_id} checkpoint={checkpoint_id} step={step}] {action}."
        )

    # ------------------------------------------------------------------
    # Saver hook + search
    # ------------------------------------------------------------------

    def summarize_and_remember(
        self,
        *,
        thread_id: str,
        checkpoint_id: str,
        checkpoint: dict[str, Any],
        metadata: dict[str, Any],
    ) -> str:
        """Build a summary, store it in MemWal, and return the summary text.

        Failures are swallowed (returning the summary anyway) so a MemWal hiccup
        never blocks the authoritative Walrus checkpoint write. The exact layer
        is the source of truth; the semantic layer is best-effort.
        """
        summary = self.build_summary(thread_id, checkpoint_id, checkpoint, metadata)
        try:
            self._client.remember_and_wait(summary, namespace=self.namespace)
        except Exception:  # noqa: BLE001 - semantic layer must not break saving
            pass
        return summary

    def search_history(self, query: str, *, limit: int = 5) -> list[dict[str, Any]]:
        """Semantically search past checkpoint summaries.

        Args:
            query: Natural-language question, e.g. "when did the writer start?".
            limit: Max number of hits to return.

        Returns:
            A list of ``{"text": str, "distance": float}`` dicts, nearest first.
        """
        from memwal import RecallParams

        result = self._client.recall(
            RecallParams(query=query, limit=limit), namespace=self.namespace
        )
        return [
            {"text": hit.text, "distance": hit.distance} for hit in result.results
        ]
