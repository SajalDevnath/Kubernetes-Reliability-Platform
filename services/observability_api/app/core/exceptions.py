"""BFF and upstream exception types."""


class ObservabilityApiError(Exception):
    """Base exception for observability API errors."""

    code: str = "INTERNAL_ERROR"
    status_code: int = 500

    def __init__(self, message: str, upstream: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.upstream = upstream


class UpstreamUnavailable(ObservabilityApiError):
    """Raised when an upstream service cannot be reached."""

    code = "UPSTREAM_UNAVAILABLE"
    status_code = 502


class UpstreamTimeout(ObservabilityApiError):
    """Raised when an upstream service request times out."""

    code = "UPSTREAM_TIMEOUT"
    status_code = 504


class UpstreamHttpError(ObservabilityApiError):
    """Raised when an upstream service returns a non-success HTTP status."""

    code = "UPSTREAM_HTTP_ERROR"
    status_code = 502

    def __init__(
        self,
        message: str,
        upstream: str | None = None,
        http_status_code: int | None = None,
    ) -> None:
        super().__init__(message, upstream=upstream)
        self.http_status_code = http_status_code


class UpstreamMalformedResponse(ObservabilityApiError):
    """Raised when an upstream service returns an unparseable response."""

    code = "UPSTREAM_MALFORMED"
    status_code = 502


class InvalidRequest(ObservabilityApiError):
    """Raised when a client request fails validation."""

    code = "INVALID_REQUEST"
    status_code = 400
