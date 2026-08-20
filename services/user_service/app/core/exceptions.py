"""Application-specific exceptions."""


class UserNotFoundError(Exception):
    """Raised when a user record does not exist."""


class UserEmailConflictError(Exception):
    """Raised when a user email is already registered."""
