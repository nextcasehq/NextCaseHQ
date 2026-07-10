# Network Perimeter & Zero-Trust Architecture

## 1. Transport Security
- **Edge Termination**: Enforce TLS 1.3 exclusively at the network edge.
- **Internal mTLS**: All service-to-service communication (e.g., `web` -> `workers`) must use mutual TLS (mTLS) with certificates managed via a internal Certificate Authority (CA) or Service Mesh (e.g., Istio).
- **Encryption in Transit**: No unencrypted traffic is permitted within the internal network boundaries.

## 2. Request Authorization Flow
- **Authentication**: JWT access tokens are issued by the `IdentityService` and must contain the `tenant_id` and `user_id`.
- **Edge Validation**:
  - Intercept incoming requests at the Edge Middleware.
  - Verify JWT signature using `jose` or equivalent edge-compatible library.
  - Validate the `exp` (expiration) and `nbf` (not before) claims.
- **Context Injection**:
  - Upon successful validation, translate the token data into an immutable `X-Tenant-ID` header.
  - Forward the request to the origin server with the injected header.
- **Sanitization**: Strip the original `Authorization` header before it reaches the backend services to prevent accidental token leakage.
