"""Application-specific exceptions."""


class OrderNotFoundError(Exception):
    """Raised when an order record does not exist."""


class InvalidOrderStateError(Exception):
    """Raised when an order update is not allowed for the current status."""


class PaymentServiceError(Exception):
    """Raised when Payment Service returns an error or invalid response."""


class PaymentServiceUnavailableError(PaymentServiceError):
    """Raised when Payment Service cannot be reached."""


class PaymentServiceTimeoutError(PaymentServiceError):
    """Raised when a Payment Service request times out."""
