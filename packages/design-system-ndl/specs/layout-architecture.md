# NDL Core Layout Architecture & Component Shell

## 1. Global Navigation Shell
- **Tenant Context Indicator**: Persistent top-left anchor displaying the `active_tenant_id` name and security classification.
- **Switching Mechanism**: Modal-based context picker with mandatory MFA re-verification on tenant boundary crossing.

## 2. Case Workspace (Tri-Pane Horizontal Topology)
- **Left Panel (25%)**: Evidence & Citation Ledger. Monospaced, highly scannable vertical list.
- **Central Panel (45%)**: AI Dialogue Stream. Serif-based typography for long-form readability. No playful accents; strictly professional dialogue.
- **Right Panel (30%)**: Production Drafting Canvas. Dynamic WYSIWYG editor with real-time citation linking.

## 3. Telemetry HUD (Edge Monitoring)
- **Position**: Bottom-right persistent overlay.
- **Indicators**:
  - **Middleware Latency**: Real-time measurement of the 5ms API gateway budget.
  - **Encryption Overhead**: Client-side transform time for Zero-Knowledge operations (target: <50ms).
  - **Stream Throughput**: Visualization of active AI token streaming speed.

## 4. Interaction Patterns
- **Responsive Scaling**: Automated layout transition to "Tactical Mobile Court Mode" for viewports <768px.
- **Panel Resizing**: Controlled drag-handles with snap-points at 10% increments.
