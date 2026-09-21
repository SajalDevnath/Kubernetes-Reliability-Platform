"""Approved Tempo search parameter builders for traces endpoints."""


def trace_search(service: str | None, limit: int) -> dict[str, object]:
    """Return allowlisted Tempo search query parameters."""
    params: dict[str, object] = {"limit": limit}
    if service is not None:
        params["q"] = f'{{ trace:rootService = "{service}" }}'
    return params
