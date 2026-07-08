# Agnostic Deployment Target Schemas

## 1. Deployment Abstraction
- **Containerization**: All application components must be packaged as OCI-compliant container images.
- **Configuration**: Use Environment Variables and Secret Injection for runtime configuration (Twelve-Factor App principles).

## 2. Hybrid Edge Deployment (Vercel + Managed Cloud)
- **Framework**: Next.js App Router.
- **Compute**:
  - API Routes & Middleware: Edge Runtimes / Serverless Functions.
  - Workers: AWS Lambda / Google Cloud Functions.
- **Database**: Managed Serverless PostgreSQL (e.g., Neon / AWS Aurora Serverless).
- **Caching**: Distributed Redis (e.g., Upstash / AWS ElastiCache).

## 3. Private Cloud On-Premise Deployment (Kubernetes)
- **Framework**: Containerized Next.js Node.js server.
- **Compute**:
  - Web & Workers: Kubernetes Pods managed via Helm charts.
  - Ingress: NGINX Ingress Controller with mTLS enabled.
- **Database**: Internal High-Availability PostgreSQL cluster (e.g., Patroni / CrunchyData operator).
- **Storage**: Persistent Volumes (PVs) using Local Storage or S3-compatible internal storage (e.g., MinIO).
- **Security**: Network Policies to enforce service-level isolation.
