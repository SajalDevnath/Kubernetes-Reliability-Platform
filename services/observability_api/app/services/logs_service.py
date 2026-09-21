from datetime import datetime, timedelta, timezone

from app.clients.loki import LokiClient
from app.core.constants import LOGS_DEFAULT_MINUTES, LOGS_DIRECTION_DEFAULT
from app.core.validation import validate_logs_limit, validate_service
from app.normalization import loki as loki_norm
from app.queries import loki as loki_queries
from app.schemas.logs import LogsResponse


class LogsService:
    """Orchestrates curated Loki log queries and normalization."""

    def __init__(self, loki_client: LokiClient) -> None:
        self._loki = loki_client

    def get_logs(self, service: str, limit: int | None = None) -> LogsResponse:
        """Return normalized recent logs for a validated service."""
        validated_service = validate_service(service)
        validated_limit = validate_logs_limit(limit)
        checked_at = datetime.now(timezone.utc)
        end = checked_at
        start = end - timedelta(minutes=LOGS_DEFAULT_MINUTES)

        start_ns = int(start.timestamp() * 1_000_000_000)
        end_ns = int(end.timestamp() * 1_000_000_000)

        payload = self._loki.query_range(
            loki_queries.service_logs(validated_service),
            start_ns=start_ns,
            end_ns=end_ns,
            limit=validated_limit,
            direction=LOGS_DIRECTION_DEFAULT,
        )
        logs = loki_norm.parse_log_streams(payload, validated_service, validated_limit)

        return LogsResponse(
            checked_at=checked_at,
            service=validated_service,
            limit=validated_limit,
            logs=logs,
        )
