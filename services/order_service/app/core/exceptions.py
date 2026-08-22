"""Application-specific exceptions."""


class OrderNotFoundError(Exception):
    """Raised when an order record does not exist."""


class InvalidOrderStateError(Exception):
    """Raised when an order update is not allowed for the current status."""
