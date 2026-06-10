"""A minimal 2-node LangGraph agent: researcher -> writer.

The graph is intentionally tiny so the *checkpointing* story is the star, not
the agent. ``researcher`` gathers "sources" for a topic; ``writer`` turns them
into a short report. An LLM is used when one is configured (provider-agnostic via
:func:`make_llm`); otherwise both nodes fall back to deterministic stubs so the
demo runs anywhere with zero external dependencies — which is exactly what Step 3
needs (it runs against the in-memory Walrus fake).

State flows: topic -> sources -> report.
"""

from __future__ import annotations

import os
from typing import Annotated, Optional
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, START, END


class AgentState(TypedDict, total=False):
    """Shared state for the researcher -> writer pipeline.

    Attributes:
        topic: The subject to research and write about.
        sources: Bullet facts produced by the researcher.
        report: The final short report produced by the writer.
    """

    topic: str
    sources: list[str]
    report: str


def make_llm() -> Optional[object]:
    """Build a chat model from env, or return ``None`` to use stub nodes.

    Honors ``LLM_PROVIDER`` (``deepseek`` or ``anthropic``). DeepSeek uses an
    OpenAI-compatible endpoint via ``langchain-openai``; Anthropic uses
    ``langchain-anthropic``. Any missing key or package yields ``None`` so the
    demo degrades gracefully to deterministic behavior.
    """
    provider = os.getenv("LLM_PROVIDER", "deepseek").lower()
    try:
        if provider == "deepseek":
            key = os.getenv("DEEPSEEK_API_KEY")
            if not key:
                return None
            from langchain_openai import ChatOpenAI

            return ChatOpenAI(
                model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
                base_url="https://api.deepseek.com",
                api_key=key,
                temperature=0.3,
            )
        if provider == "anthropic":
            key = os.getenv("ANTHROPIC_API_KEY")
            if not key:
                return None
            from langchain_anthropic import ChatAnthropic

            return ChatAnthropic(model="claude-3-5-haiku-latest", temperature=0.3)
    except Exception:
        # Package not installed or client init failed: fall back to stubs.
        return None
    return None


def _researcher_node(state: AgentState) -> AgentState:
    """Produce a few 'sources' for the topic (LLM if available, else stub)."""
    topic = state.get("topic", "an unspecified topic")
    llm = make_llm()
    if llm is not None:
        prompt = (
            f"List exactly 3 short factual bullet points about: {topic}. "
            "One per line, no numbering, no preamble."
        )
        text = llm.invoke(prompt).content
        sources = [ln.strip("-* ").strip() for ln in text.splitlines() if ln.strip()]
        sources = sources[:3] or [f"General background on {topic}."]
    else:
        sources = [
            f"{topic} is an active area with recent developments.",
            f"Key concepts underpinning {topic} are well documented.",
            f"There are open challenges remaining in {topic}.",
        ]
    return {"sources": sources}


def _writer_node(state: AgentState) -> AgentState:
    """Turn sources into a short report (LLM if available, else stub)."""
    topic = state.get("topic", "the topic")
    sources = state.get("sources", [])
    llm = make_llm()
    if llm is not None:
        joined = "\n".join(f"- {s}" for s in sources)
        prompt = (
            f"Write a 3-sentence report about '{topic}' using these notes:\n"
            f"{joined}\nReturn only the report."
        )
        report = llm.invoke(prompt).content.strip()
    else:
        bullets = " ".join(sources)
        report = (
            f"Report on {topic}: {bullets} "
            f"In summary, {topic} merits continued attention."
        )
    return {"report": report}


def build_agent(checkpointer, *, interrupt_before_writer: bool = False):
    """Compile the researcher -> writer graph with the given checkpointer.

    Args:
        checkpointer: Any LangGraph ``BaseCheckpointSaver`` (here, ``WalrusSaver``).
        interrupt_before_writer: If True, pause the graph before the writer node
            so a crash/resume can be demonstrated mid-pipeline.

    Returns:
        A compiled LangGraph application.
    """
    g = StateGraph(AgentState)
    g.add_node("researcher", _researcher_node)
    g.add_node("writer", _writer_node)
    g.add_edge(START, "researcher")
    g.add_edge("researcher", "writer")
    g.add_edge("writer", END)

    kwargs = {"checkpointer": checkpointer}
    if interrupt_before_writer:
        kwargs["interrupt_before"] = ["writer"]
    return g.compile(**kwargs)
