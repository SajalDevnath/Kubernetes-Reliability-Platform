"""Approved LogQL query builders for logs endpoints."""


def service_logs(service: str) -> str:
    """Return LogQL for recent logs from a validated KRP service."""
    return f'{{service="{service}"}}'
