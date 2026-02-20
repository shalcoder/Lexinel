import time
import threading
from typing import Any, Optional, Dict

class SimpleTTLCache:
    """
    A specific, thread-safe in-memory cache with Time-To-Live (TTL) and Max Size.
    Designed to prevent memory leaks in long-running backend processes.
    """
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self._cache: Dict[str, dict] = {}
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        """Retrieve a value if it exists and hasn't expired."""
        with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            if time.time() > entry['expires_at']:
                del self._cache[key]
                return None
            
            return entry['value']

    def set(self, key: str, value: Any, ttl: int = None):
        """Set a value with an optional specific TTL."""
        with self._lock:
            # Eviction Policy: If full, remove the oldest item (simplistic LRU approximation by insertion order)
            # In Python 3.7+, dicts preserve insertion order.
            if len(self._cache) >= self._max_size:
                # Remove first key (FIFO/Oldest)
                iterator = iter(self._cache)
                try:
                    oldest_key = next(iterator)
                    del self._cache[oldest_key]
                except StopIteration:
                    pass

            expiry = time.time() + (ttl if ttl is not None else self._default_ttl)
            self._cache[key] = {
                'value': value,
                'expires_at': expiry
            }

    def delete(self, key: str):
        """Remove a key explicitly."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def clear(self):
        """Clear all cache."""
        with self._lock:
            self._cache.clear()

    def cleanup(self):
        """Manually trigger cleanup of expired items."""
        with self._lock:
            now = time.time()
            keys_to_remove = [k for k, v in self._cache.items() if now > v['expires_at']]
            for k in keys_to_remove:
                del self._cache[k]

# Global Instance
# Default: 1000 items, 5 minutes TTL
policy_cache = SimpleTTLCache(max_size=1000, default_ttl=300)
