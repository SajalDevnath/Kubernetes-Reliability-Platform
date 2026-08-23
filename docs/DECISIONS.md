# Architecture Decision Records

This log records significant architectural and technical decisions for the Kubernetes Reliability Platform.

---

## ADR-001 — Use Local Kubernetes for the Core Project

**Date:** 2026-08-17

**Decision:**
The core project will run locally using kind for Kubernetes clusters.

**Reason:**
The project should not depend on AWS or other cloud providers for learning Kubernetes and SRE concepts. Local development reduces cost, complexity, and external dependencies while providing full Kubernetes functionality.

**Status:** Accepted

---

## ADR-002 — Use Python/FastAPI for the Application Layer

**Date:** 2026-08-17

**Decision:**
The microservices will be implemented using Python and FastAPI.

**Reason:**
The project focuses on Cloud/DevOps/SRE rather than Java-specific backend development. Python provides a natural foundation for the later AI layer and has excellent ecosystem support for FastAPI, SQLAlchemy, and observability tooling.

**Status:** Accepted

---

## ADR-003 — Use uv for Python Dependency Management

**Date:** 2026-08-17

**Decision:**
Python dependency and environment management will use `uv`.

**Reason:**
`uv` provides a modern, fast, and simple approach to Python project and dependency management, replacing the need for pip, pip-tools, and virtualenv separately.

**Status:** Accepted

---

## ADR-004 — Use PostgreSQL as the Database

**Date:** 2026-08-17

**Decision:**
PostgreSQL will be the database for all microservices.

**Reason:**
PostgreSQL is widely used, well-supported, runs locally in containers, and integrates naturally with SQLAlchemy. It provides realistic operational scenarios for database monitoring and failure simulation.

**Status:** Accepted

---

## ADR-005 — AI as the Final Layer

**Date:** 2026-08-17

**Decision:**
AI capabilities (incident analysis, tool calling, RAG, remediation) will be introduced only after the reliability platform works fully without AI.

**Reason:**
The platform must demonstrate operational engineering fundamentals independently. AI should augment existing observability and runbooks, not replace them. This ensures the reliability foundation is solid before adding AI complexity.

**Status:** Accepted

---

## ADR-006 — Intentionally Simple Business Logic

**Date:** 2026-08-17

**Decision:**
Application business logic will remain intentionally simple across all microservices.

**Reason:**
The primary purpose is demonstrating operational and reliability engineering concepts — not building a complex business application. Simple logic keeps focus on infrastructure, observability, and SRE practices.

**Status:** Accepted

---

## ADR-007 — Monorepo Layout with `services/` Directory

**Date:** 2026-08-18

**Decision:**
Application microservices will live under `services/<service_name>/` with a shared root `pyproject.toml` managed by uv.

**Reason:**
This layout scales naturally to three microservices (User, Order, Payment) while keeping a single dependency lockfile and consistent tooling at the repository root. Each service owns its `app/` package with routers, schemas, and core configuration.

**Status:** Accepted

---

## ADR-008 — Non-Package uv Project for Application Code

**Date:** 2026-08-18

**Decision:**
The root `pyproject.toml` uses `[tool.uv] package = false` because the repository is an application monorepo, not a publishable Python library.

**Reason:**
Services are run directly via uvicorn with `--app-dir` rather than installed as editable packages. This avoids unnecessary build configuration while still using uv for dependency management and virtual environments.

**Status:** Accepted

---

## ADR-009 — Synchronous SQLAlchemy for Milestone 1

**Date:** 2026-08-19

**Decision:**
The User Service database layer will use synchronous SQLAlchemy 2.x APIs with the `psycopg2` driver.

**Reason:**
The existing FastAPI endpoints are synchronous, and the milestone scope is establishing a minimal database foundation. Synchronous SQLAlchemy keeps the initial implementation simple; async database access can be evaluated later if needed.

**Status:** Accepted

---

## ADR-010 — Minimal User Model Fields

**Date:** 2026-08-20

**Decision:**
The User Service will use a minimal user model with `email`, `full_name`, and `is_active` fields. No password or authentication fields are included at this stage.

**Reason:**
The project specification does not define detailed user fields, and authentication is out of scope for Milestone 2. A minimal model supports CRUD demonstration without introducing unnecessary security complexity before it is required.

**Status:** Accepted

**Verification:** User Service CRUD and PostgreSQL integration tests passing (2026-08-20).

---

## ADR-011 — Minimal Order Model Fields

**Date:** 2026-08-22

**Decision:**
The Order Service will use a minimal `Order` model with `user_id`, `status`, and `total_amount` fields, plus standard timestamps. `user_id` is stored as an integer reference to the User Service without a database foreign key constraint. `OrderStatus` values are `pending`, `paid`, and `cancelled`.

**Reason:**
The project specification defines order management and future Order → Payment communication but does not specify detailed order fields. `user_id` links an order to a user, `status` supports order lifecycle and payment outcomes, and `total_amount` supports payment processing. Omitting a cross-service foreign key follows microservice boundaries while sharing PostgreSQL for local development.

**Status:** Accepted

**Verification:** Order Service CRUD and PostgreSQL integration tests passing (2026-08-22).

---

## ADR-012 — Minimal Payment Model Fields

**Date:** 2026-08-23

**Decision:**
The Payment Service will use a minimal `Payment` model with `order_id`, `amount`, and `status` fields, plus standard timestamps. `order_id` is stored as an integer reference to the Order Service without a database foreign key constraint. `PaymentStatus` values are `pending`, `successful`, and `failed`. No card numbers, CVV, or other sensitive payment credentials are stored.

**Reason:**
The project specification defines payment processing and future Order → Payment communication but does not specify detailed payment fields. `order_id` links a payment to an order, `amount` records the payment value, and `status` tracks payment outcome. Omitting a cross-service foreign key follows microservice boundaries while sharing PostgreSQL for local development. Sensitive payment data is excluded by design.

**Status:** Accepted

**Verification:** Payment Service CRUD and PostgreSQL integration tests passing (2026-08-23).
