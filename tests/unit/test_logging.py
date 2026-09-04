import json
import logging
from io import StringIO

import pytest

from app.logging import JsonFormatter, build_log_config, setup_logging

REQUIRED_FIELDS = ("timestamp", "level", "service", "logger", "message")


@pytest.fixture
def log_output() -> StringIO:
    return StringIO()


@pytest.fixture
def service_logger(log_output: StringIO) -> logging.Logger:
    setup_logging("user-service", "debug")
    handler = logging.StreamHandler(log_output)
    handler.setFormatter(JsonFormatter(service_name="user-service"))
    logger = logging.getLogger("tests.user_service.logging")
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    return logger


def test_log_record_is_valid_json(service_logger: logging.Logger, log_output: StringIO) -> None:
    service_logger.info("hello world")

    payload = json.loads(log_output.getvalue().strip())

    assert isinstance(payload, dict)


def test_required_fields_present(service_logger: logging.Logger, log_output: StringIO) -> None:
    service_logger.info("hello world")

    payload = json.loads(log_output.getvalue().strip())

    for field in REQUIRED_FIELDS:
        assert field in payload


def test_service_field_matches_service_name(
    service_logger: logging.Logger, log_output: StringIO
) -> None:
    service_logger.info("hello world")

    payload = json.loads(log_output.getvalue().strip())

    assert payload["service"] == "user-service"


def test_log_level_filters_output(log_output: StringIO) -> None:
    setup_logging("user-service", "warning")
    root = logging.getLogger()
    root.handlers.clear()
    handler = logging.StreamHandler(log_output)
    handler.setFormatter(JsonFormatter(service_name="user-service"))
    root.addHandler(handler)

    test_logger = logging.getLogger("tests.log_level_filter")
    test_logger.debug("hidden")
    test_logger.info("hidden")
    test_logger.warning("visible")

    lines = [line for line in log_output.getvalue().splitlines() if line.strip()]
    assert len(lines) == 1
    payload = json.loads(lines[0])
    assert payload["level"] == "WARNING"
    assert payload["message"] == "visible"


def test_logger_name_preserved(service_logger: logging.Logger, log_output: StringIO) -> None:
    service_logger.info("hello world")

    payload = json.loads(log_output.getvalue().strip())

    assert payload["logger"] == "tests.user_service.logging"


def test_message_preserved(service_logger: logging.Logger, log_output: StringIO) -> None:
    service_logger.info("hello world")

    payload = json.loads(log_output.getvalue().strip())

    assert payload["message"] == "hello world"


def test_exception_includes_error_fields(
    service_logger: logging.Logger, log_output: StringIO
) -> None:
    try:
        raise ValueError("boom")
    except ValueError:
        service_logger.exception("request failed")

    payload = json.loads(log_output.getvalue().strip())

    assert payload["exc_type"] == "ValueError"
    assert payload["exc_message"] == "boom"
    assert "stack" in payload
    assert "ValueError: boom" in payload["stack"]


def test_uvicorn_access_log_parses_http_fields(log_output: StringIO) -> None:
    formatter = JsonFormatter(service_name="user-service")
    record = logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg='%s - "%s %s HTTP/%s" %d',
        args=("127.0.0.1:12345", "GET", "/health", "1.1", 200),
        exc_info=None,
    )

    payload = json.loads(formatter.format(record))

    assert payload["method"] == "GET"
    assert payload["path"] == "/health"
    assert payload["status_code"] == 200


def test_build_log_config_includes_uvicorn_loggers() -> None:
    config = build_log_config("user-service", "info")

    assert "uvicorn" in config["loggers"]
    assert "uvicorn.access" in config["loggers"]
    assert "uvicorn.error" in config["loggers"]
