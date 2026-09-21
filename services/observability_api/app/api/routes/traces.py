from fastapi import APIRouter, Depends, Query

from app.api.deps import get_upstream_clients
from app.clients.factory import UpstreamClients
from app.schemas.traces import TraceDetailResponse, TraceSearchResponse
from app.services.traces_service import TracesService

router = APIRouter(prefix="/traces", tags=["traces"])


def get_traces_service(
    upstream_clients: UpstreamClients = Depends(get_upstream_clients),
) -> TracesService:
    """Build the traces service from upstream clients."""
    return TracesService(upstream_clients.tempo)


@router.get("", response_model=TraceSearchResponse)
def search_traces(
    service: str | None = Query(default=None),
    limit: int | None = Query(default=None),
    traces_service: TracesService = Depends(get_traces_service),
) -> TraceSearchResponse:
    """Return normalized recent traces from Tempo."""
    return traces_service.search_traces(service=service, limit=limit)


@router.get("/{trace_id}", response_model=TraceDetailResponse)
def get_trace_detail(
    trace_id: str,
    traces_service: TracesService = Depends(get_traces_service),
) -> TraceDetailResponse:
    """Return normalized trace detail for a validated trace ID."""
    return traces_service.get_trace_detail(trace_id)
