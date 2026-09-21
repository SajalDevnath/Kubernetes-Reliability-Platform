"""Sample Loki API responses for observability BFF tests."""

SERVICE_LOGS_STREAMS = {
    "status": "success",
    "data": {
        "resultType": "streams",
        "result": [
            {
                "stream": {
                    "service": "user-service",
                    "level": "INFO",
                    "logger": "uvicorn.access",
                },
                "values": [
                    [
                        "1735689600000000000",
                        (
                            '{"timestamp":"2026-01-01T00:00:00Z","level":"INFO",'
                            '"service":"user-service","logger":"uvicorn.access",'
                            '"message":"GET /health","method":"GET","path":"/health",'
                            '"status_code":200,"trace_id":"trace-1","span_id":"span-1"}'
                        ),
                    ],
                    [
                        "1735689500000000000",
                        "plain text log line",
                    ],
                ],
            },
            {
                "stream": {
                    "service": "user-service",
                    "level": "ERROR",
                },
                "values": [
                    [
                        "1735689700000000000",
                        (
                            '{"timestamp":"2026-01-01T00:01:40Z","level":"ERROR",'
                            '"service":"user-service","logger":"app.main",'
                            '"message":"request failed"}'
                        ),
                    ],
                ],
            },
        ],
        "stats": {},
    },
}

EMPTY_STREAMS = {
    "status": "success",
    "data": {
        "resultType": "streams",
        "result": [],
        "stats": {},
    },
}

MALFORMED_STATUS = {
    "status": "error",
    "error": "something went wrong",
}

MALFORMED_RESULT_TYPE = {
    "status": "success",
    "data": {
        "resultType": "matrix",
        "result": [],
    },
}
