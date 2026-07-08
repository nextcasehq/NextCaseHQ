# NDL State Matrix & Accessibility Constitution

## 1. Application State Matrix
| State | Behavioral Law | UI feedback |
| :--- | :--- | :--- |
| **IDLE** | System ready for instruction. | Semantic: `brand.surface` |
| **LOADING** | Fetching non-streamed data. | Progress bar (non-blocking). |
| **STREAMING** | Active AI token output. | Pulse indicator; keyboard focus locked to input. |
| **ERRORED** | Non-fatal operational fault. | Inline alert; secure error string only. |
| **BOUNDARY_VIOLATION** | Cross-tenant access attempt. | Instant lockout; full viewport warning. |

## 2. Accessibility Laws (ARIA & Focus)
- **Keyboard Trap Prevention**: During active data streaming, focus must be trapped within the `AIChamber` input field to prevent accidental navigation away from the live context.
- **Screen Reader Announcements**:
  - Use `aria-live="polite"` for background ingestion status updates.
  - Use `aria-live="assertive"` for tenant boundary violations or critical compliance warnings.
- **Touch Target Law**: All interactive elements in "Mobile Court Mode" must adhere to a minimum 48x48px footprint (Section 37).

## 3. Density & Scannability
- Dense layout mode must maintain a minimum 1.1 line-height for monospaced texts to ensure readability in evidence lists.
- Semantic colors must have a minimum 4.5:1 contrast ratio against the `bg-base`.
