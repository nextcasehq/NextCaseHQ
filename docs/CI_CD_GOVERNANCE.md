# NextCaseHQ — Enterprise CI/CD Pipeline & Repository Governance
### DevOps & Repository Infrastructure Architecture Specification (v1.0)

This document establishes the authoritative specification for NextCaseHQ's production-grade GitHub Actions CI/CD pipeline, branch protection, and Sentinel governance integration.

Under the new model, GitHub Actions serves as the **single source of truth** for all validation and deployment gates. Local repository checkins of generated reports are strictly prohibited. Instead, the workspace remains perfectly clean, and execution artifacts are uploaded directly to the GitHub Actions execution platform.

---

## 1. Workflow Architecture & Pipeline Topologies

The CI/CD pipeline is designed around a single robust, high-fidelity, unified verification workflow.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXTCASEHQ CI/CD PIPELINE                       │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                      1. Check out Source Repository
                                    │
                                    ▼
                         2. Setup Node.js (v20)
                                    │
                                    ▼
                   3 & 4. Cache & Install Dependencies
                                    │
                                    ▼
                   5. TypeScript Compile & Type Check
                                    │
                                    ▼
                       6. ESLint Syntax Validation
                                    │
                                    ▼
                      7. Next.js Production Build
                                    │
                                    ▼
                   8. Run Unit Tests & Specs (w/ Coverage)
                                    │
                                    ▼
                  9. Setup Python & Headless Playwright
                                    │
                                    ▼
            10. Execute Releases & Business Sentinel (BEVS)
                                    │
                                    ▼
               11. Compile Visual Playwright HTML Report
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
 [Upload Artifacts to GHA]                          [Gate Verification Check]
 - HTML/Video Playwright Reports                    - Fail fast if any Sentinel
 - Diagnostic JSON Logs                               reports "FAIL" status.
 - Unit Coverage Reports
```

---

## 2. Triggering Matrices

The CI/CD workflow automatically triggers on:
1. **Pull Requests (pull_request)**: Every PR submitted against any branch.
2. **Main Branch Pushes (push)**: Every merge, direct push, or squash action targeting the `main` branch.
3. **Manual Trigger (workflow_dispatch)**: Allows authorized engineers to force-run the pipeline with customizable branches.

---

## 3. Detailed Pipeline Stages (1–10)

### Stage 1: Checkout Repository
Uses `actions/checkout@v4` with a fetch depth of `0` to pull the complete Git commit timeline. This allows historical analysis and divergence checks.

### Stage 2: Setup Node.js
Configures the runner to execute inside a Node.js 20 environment using `actions/setup-node@v4` to align with the Next.js runtime.

### Stage 3: Cache Dependencies
Utilizes `actions/cache@v4` to cache the global `~/.local/share/pnpm/store` location. This accelerates dependency mapping and cuts setup times down to under 15 seconds.

### Stage 4: Install Dependencies
Installs dependencies via `pnpm install --frozen-lockfile` to enforce exact version consistency according to the repository `pnpm-lock.yaml`.

### Stage 5: TypeScript Validation
Executes `pnpm exec tsc --noEmit` across the entire workspace structure, ensuring there are no unresolved types or syntax regressions before testing.

### Stage 6: ESLint Validation
Executes `pnpm lint` to verify that code formatting, style boundaries, and standard static analysis criteria are satisfied.

### Stage 7: Next.js Production Build
Builds production packages using `pnpm run build` (triggering Turborepo to compile `apps/web` and `apps/workers`). Any compilation drift will cause an immediate fail-fast termination.

### Stage 8: Unit Tests
Runs the complete test suites with statement, line, function, and branch coverage tracking:
- Web workspace unit tests: `pnpm --filter web test --coverage`
- Cryptographic workspace unit tests: `pnpm --filter @nextcase/crypto test --coverage`
- Visual Spec checks: `npx vitest run packages/qa/specs/visual-regression.spec.ts`

### Stage 9: Playwright End-to-End Tests
Installs and configures python-based Playwright framework dependencies (`pip install playwright && playwright install chromium --with-deps`) to simulate real human user journeys inside a virtual, multi-viewport container, generating automated `.webm` videos and high-fidelity `.png` screenshots.

### Stage 10: Execute Existing Validation Framework
Integrates all existing Sentinels using the CLI. The release pipeline runs:
- `node sentinels/sentinel-cli.js release` to run:
  - **Architecture Sentinel**: Verifies layout inheritance, canonical flat paths, and blocks duplicate Navbars/Footers.
  - **Build Sentinel**: Audits dependency drifts, and validates workspace types.
  - **UI Sentinel**: Simulates user login, multi-viewport responsive render paths, RLS context injection, and verifies compliance with the Warm Ivory / pure Obsidian Charcoal style parameters.
  - **Release Sentinel**: Synthesizes child sentinel report findings and issues the final Executive Health Report.
- `node sentinels/sentinel-cli.js bevs` to run:
  - **Business Execution & Verification Sentinel (BEVS)**: Runs step-by-step business flow simulations and tracks platform defects.

---

## 4. Workflows & Artifact Registry

Rather than checking reports directly into version control (which causes high Git merge contention and bloats git metadata), all reports are kept outside Git tracking and uploaded as workflow artifacts.

| Artifact Name | Path / Source Files | Format | Description |
| :--- | :--- | :--- | :--- |
| **playwright-html-report** | `reports/latest/ui/playwright-report/` | `HTML/CSS` | Responsive visual report embedding E2E screenshots and videos. |
| **playwright-screenshots** | `reports/runs/*/ui/evidence/*.png` | `PNG` | Captured mobile/desktop user journey screens. |
| **playwright-videos** | `reports/runs/*/ui/evidence/videos/*.webm` | `WEBM` | Full motion recordings of automated user interactions. |
| **browser-console-logs** | `reports/latest/ui/playwright_result.json` | `JSON` | Captures uncaught browser console exceptions during runtime. |
| **architecture-sentinel-report** | `reports/latest/architecture/` | `JSON` | Layout, rendering tree, and merge conflict report files. |
| **build-sentinel-report** | `reports/latest/build/` | `JSON` | Monorepo build and dependency drift telemetry reports. |
| **ui-sentinel-report** | `reports/latest/ui/` | `JSON` | Design token violations, scores, and Enterprise UX audits. |
| **release-sentinel-report** | `reports/latest/release/` | `JSON` | Executive Health, trend metrics, and operational readiness. |
| **bevs-report** | `reports/latest/bevs/` | `JSON` | Step-by-step business workflow traces and defect registry status. |
| **unit-test-coverage-reports** | `**/coverage/` | `HTML/LCOV` | Comprehensive test coverage analytics for apps and libraries. |
| **build-validation-logs** | `reports/*.log` | `LOG` | Full raw execution logs for debug and audit trail. |

---

## 5. Failure Diagnosis & Triage Protocols

When a pipeline build fails, use the following sequential protocol to diagnose the underlying issues:

1. **Check GitHub Action Status Checks**: Locate which step in the job execution list has the red cross.
2. **If Unit Tests/Tsc/ESLint Fail**:
   - Inspect the command outputs directly inside the GitHub Actions action runner logs.
   - Replicate the error locally using `pnpm exec tsc --noEmit` or `pnpm --filter <pkg> test`.
3. **If Sentinels Fail**:
   - Download the corresponding Sentinel report artifact (`architecture-sentinel-report`, `build-sentinel-report`, `ui-sentinel-report`, etc.).
   - Inspect the `findings.json` and `diagnostics.json` files. These files contain highly descriptive, developer-friendly diagnostic recommendations detailing the exact root cause, impact, and a recommended fix.
4. **If Playwright E2E Fails**:
   - Download the `playwright-html-report` and `playwright-screenshots`/`playwright-videos`.
   - Open `index.html` locally to view exactly what was on screen when the page assertion or element selector failed.
   - Play the `.webm` video track to trace client-side React hydration errors.

---

## 6. GitHub Branch Protection Configuration Guide

To secure the main branch against untested commits and enforce high-fidelity pipeline compliance, establish the following settings under **Settings** ➔ **Branches** in the GitHub repository:

1. **Branch name pattern**: `main`
2. **Protect Matching Branches**:
   - [x] **Require a pull request before merging**
     - [x] Require approvals (Recommend: 1)
   - [x] **Require status checks to pass before merging**
     - [x] Require branches to be up to date before merging
     - **Status checks required**:
       - `Verification & Release Gates` (The job name of our CI/CD pipeline)
   - [x] **Require conversation resolution before merging**
   - [x] **Restrict pushes to matching branches** (Prevents direct pushes to `main`)

---

## 7. TypeScript Project Graph & Scalability Guide

To maintain 100% type safety and prevent skipped or unchecked code as NextCaseHQ scales, the CI/CD pipeline runs the canonical validator script `scripts/typescript_validation.js`.

### How to Add a New Package / Workspace to the Type-Safety Graph

When creating a new package or app under `apps/` or `packages/`, developers must follow these strict steps:

#### Step 1: Create a Dedicated `tsconfig.json`
Every workspace/package must contain a local `tsconfig.json` defining its compiler targets, strictly excluding non-production assets. Use the standard package blueprint:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "**/spec/**",
    "**/test/**",
    "**/__tests__/**",
    "**/fixtures/**",
    "**/mocks/**",
    "**/storybook/**"
  ]
}
```

#### Step 2: Register the Project in the Validator
Open `scripts/typescript_validation.js` and register the new folder under `projectMappings` (or `excludedProjects` if the workspace has no TS files):

```javascript
// Add under projectMappings:
const projectMappings = {
  ...
  'packages/my-new-package': 'packages/my-new-package/tsconfig.json'
};
```

### Self-Healing & Fail-Fast Mechanics
If a developer forgets to register a newly created workspace directory in `scripts/typescript_validation.js`, the CI validation check will **instantly fail** with the following diagnostic message:

```
🔴 CRITICAL FAILURE: Package 'packages/my-new-package' is active in the workspace but is skipped/not referenced in the validation graph mappings!
```

This prevents untested code or structural leaks from ever entering the `main` branch.
