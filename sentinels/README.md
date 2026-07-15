# NextCaseHQ Sentinel Framework v0.1

The NextCaseHQ Sentinel Framework is an independent engineering quality governance system designed to autonomously inspect, validate, and certify code releases against our Constitutional guidelines. It is completely isolated from the application's production runtime and can be universally reused across projects (such as Oxiom and future workspaces) through simple configuration files.

## Directory Structure

```
sentinels/
├── architecture-sentinel/   # Enforces architectural alignment, structures, and dependencies
├── build-sentinel/          # Protects compilation, imports, TypeScript config, and package integrity
├── ui-sentinel/             # Inspects visual layouts, hidden CSS, and navigation completeness
├── release-sentinel/        # Consolidates reports and issues the final Release Readiness Report
├── shared/                  # Reusable reporting schemas, common file-scanning helpers, and configs
├── constitution.md          # NextCaseHQ Constitutional Commandments
└── README.md                # System documentation and execution guidelines
```

## Lifecycle Execution

1. **WAIT**: Idle state, awaiting manual command-line trigger, git lifecycle hooks, or pre-deployment tasks.
2. **TRIGGER**: Invoked manually or automatically via workspace lifecycle hooks.
3. **INSPECT**: Reads repository files, directories, dependencies, and configuration maps.
4. **COLLECT EVIDENCE**: Extracts specific file contents, regex matches, and system properties.
5. **VALIDATE**: Checks collected evidence against defined engineering constraints.
6. **DETERMINE SEVERITY**: Computes impact levels (`P0` Release Blocker, `P1` Critical, `P2` Major, `P3` Minor).
7. **GENERATE FINDINGS**: Compiles concrete anomalies and architectural drifts.
8. **GENERATE REPORT**: Produces a standardized, deterministic JSON or markdown report.
9. **NOTIFY & WAIT**: Logs the report to terminal stdout and exits with appropriate codes (`0` for PASS, `1` for FAIL/BLOCKED).

## Execution Guide

To execute all Sentinels and produce the consolidated Release Readiness Report, run:

```bash
# From the repository root
node sentinels/release-sentinel/run.js
```

Each Sentinel can also be executed independently:

```bash
node sentinels/architecture-sentinel/run.js
node sentinels/build-sentinel/run.js
node sentinels/ui-sentinel/run.js
```
