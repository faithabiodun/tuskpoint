"""TuskPoint: a verifiable LangGraph checkpointer backed by Walrus + MemWal."""

from .saver import WalrusSaver
from .walrus_client import BlobStore, InMemoryWalrusClient, WalrusClient
from .manifest import CheckpointEntry, ThreadManifest

__version__ = "0.1.0"

__all__ = [
    "__version__",
    "WalrusSaver",
    "BlobStore",
    "InMemoryWalrusClient",
    "WalrusClient",
    "CheckpointEntry",
    "ThreadManifest",
    "MemWalLayer",
]


def __getattr__(name: str):
    """Lazily expose ``MemWalLayer`` so ``memwal`` stays an optional dependency."""
    if name == "MemWalLayer":
        from .memwal_layer import MemWalLayer

        return MemWalLayer
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
