"""Sample Tempo API responses for observability BFF tests."""

TRACE_SEARCH_RESPONSE = {
    "traces": [
        {
            "traceID": "70da75c121a8e55fb8dc385971bbde24",
            "rootServiceName": "payment-service",
            "rootTraceName": "GET /metrics",
            "startTimeUnixNano": "1790004433284656150",
            "durationMs": 1,
        },
        {
            "traceID": "a1b2c3d4e5f6789012345678abcdef01",
            "rootServiceName": "user-service",
            "rootTraceName": "GET /health",
            "startTimeUnixNano": "1790004432284656150",
            "durationMs": 3,
        },
    ],
    "metrics": {
        "inspectedTraces": 8,
        "inspectedBytes": "18420",
        "completedJobs": 1,
        "totalJobs": 1,
    },
}

TRACE_DETAIL_RESPONSE = {
    "batches": [
        {
            "resource": {
                "attributes": [
                    {
                        "key": "service.name",
                        "value": {"stringValue": "payment-service"},
                    }
                ]
            },
            "scopeSpans": [
                {
                    "scope": {"name": "opentelemetry.instrumentation.fastapi"},
                    "spans": [
                        {
                            "traceId": "70da75c121a8e55fb8dc385971bbde24",
                            "spanId": "child-span-01",
                            "parentSpanId": "root-span-01",
                            "name": "GET /metrics",
                            "kind": "SPAN_KIND_SERVER",
                            "startTimeUnixNano": "1790004433284656150",
                            "endTimeUnixNano": "1790004433285656150",
                            "attributes": [
                                {
                                    "key": "http.method",
                                    "value": {"stringValue": "GET"},
                                },
                                {
                                    "key": "http.route",
                                    "value": {"stringValue": "/metrics"},
                                },
                                {
                                    "key": "http.target",
                                    "value": {"stringValue": "/metrics"},
                                },
                                {
                                    "key": "http.status_code",
                                    "value": {"intValue": "200"},
                                },
                                {
                                    "key": "broken.attribute",
                                    "value": {"kvlistValue": {"values": []}},
                                },
                            ],
                            "status": {"code": "STATUS_CODE_OK"},
                        },
                        {
                            "traceId": "70da75c121a8e55fb8dc385971bbde24",
                            "spanId": "root-span-01",
                            "name": "HTTP GET",
                            "kind": "SPAN_KIND_INTERNAL",
                            "startTimeUnixNano": "1790004433284000000",
                            "endTimeUnixNano": "1790004433286000000",
                            "attributes": [],
                            "status": {"code": "STATUS_CODE_OK"},
                        },
                    ],
                }
            ],
        }
    ]
}

MALFORMED_TRACE_DETAIL = {
    "batches": "invalid",
}
