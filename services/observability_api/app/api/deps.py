from fastapi import Request

from app.clients.factory import UpstreamClients


def get_upstream_clients(request: Request) -> UpstreamClients:
    """Return upstream clients stored on the application state."""
    return request.app.state.upstream_clients
