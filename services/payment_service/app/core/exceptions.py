"""Application-specific exceptions."""


class PaymentNotFoundError(Exception):
    """Raised when a payment record does not exist."""


class InvalidPaymentStateError(Exception):
    """Raised when a payment update is not allowed for the current status."""
