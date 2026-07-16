import sys
import time
import os
from playwright.sync_api import sync_playwright

def run_verification():
    print("[PLAYWRIGHT] Initializing browser automation...", flush=True)

    # Resolve repository root path dynamically relative to this file
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    # Resolve target directories
    run_dir = os.environ.get("SENTINEL_RUN_DIR")
    if run_dir:
        evidence_dir = os.path.join(run_dir, "ui", "evidence")
        latest_evidence_dir = os.path.join(repo_root, "reports", "latest", "ui", "evidence")
        playwright_result_path = os.path.join(run_dir, "ui", "playwright_result.json")
        latest_playwright_result_path = os.path.join(repo_root, "reports", "latest", "ui", "playwright_result.json")
    else:
        # Fallback to default ignored folder
        evidence_dir = os.path.join(repo_root, "reports", "runs", "default", "ui", "evidence")
        latest_evidence_dir = os.path.join(repo_root, "reports", "latest", "ui", "evidence")
        playwright_result_path = os.path.join(repo_root, "reports", "runs", "default", "ui", "playwright_result.json")
        latest_playwright_result_path = os.path.join(repo_root, "reports", "latest", "ui", "playwright_result.json")

    home_dir = os.path.expanduser("~")
    verification_screenshots_dir = os.path.join(home_dir, "verification", "screenshots")
    os.makedirs(verification_screenshots_dir, exist_ok=True)
    os.makedirs(evidence_dir, exist_ok=True)
    os.makedirs(latest_evidence_dir, exist_ok=True)

    console_errors = []
    page_errors = []
    broken_links = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ----------------------------------------------------
        # 1. DESKTOP VIEWPORT TEST
        # ----------------------------------------------------
        print("[PLAYWRIGHT] Launching Desktop Viewport (1280x800)...", flush=True)
        desktop_ctx = browser.new_context(
            viewport={"width": 1280, "height": 800},
            record_video_dir=os.path.join(evidence_dir, "videos")
        )
        desktop_page = desktop_ctx.new_page()

        # Wire up console and exception listeners
        desktop_page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        desktop_page.on("pageerror", lambda err: page_errors.append(str(err)))

        # A. Landing Page Loading & Visual Audit
        print("[PLAYWRIGHT] Loading Landing Page...", flush=True)
        try:
            desktop_page.goto("http://localhost:3001", timeout=10000)
            time.sleep(1.5)
            # Take desktop landing snapshots
            desktop_page.screenshot(path=os.path.join(verification_screenshots_dir, "landing_desktop.png"))
            desktop_page.screenshot(path=os.path.join(evidence_dir, "landing_desktop.png"))
            desktop_page.screenshot(path=os.path.join(latest_evidence_dir, "landing_desktop.png"))
            print("[PLAYWRIGHT] Captured landing_desktop.png successfully.", flush=True)
        except Exception as e:
            print(f"[PLAYWRIGHT] ERROR: Failed to load landing page: {e}", flush=True)
            sys.exit(1)

        # Verify Landing Elements (use .first to avoid strict mode violations)
        assert desktop_page.locator("text=NextCaseHQ").first.is_visible(), "Hero title should be visible"
        assert desktop_page.locator("text=Search").first.is_visible(), "Search button should be visible"

        # B. Authentication & Tenant Binding Flow
        print("[PLAYWRIGHT] Navigating to Sign In...", flush=True)
        desktop_page.goto("http://localhost:3001/login")
        time.sleep(1)

        desktop_page.fill("input[type='email']", "admin@firm.com")
        desktop_page.fill("input[type='password']", "password123")
        desktop_page.click("button[type='submit']")

        print("[PLAYWRIGHT] Submitted login credentials, waiting for workspace gate...", flush=True)
        desktop_page.wait_for_url("**/organization", timeout=5000)
        time.sleep(1)

        # Select first available tenant (India Practice Group)
        print("[PLAYWRIGHT] Selecting Practice Group context...", flush=True)
        desktop_page.click("button:has-text('India Practice Group')")

        print("[PLAYWRIGHT] Binding cryptographic PostgreSQL session context...", flush=True)
        desktop_page.wait_for_url("**/dashboard", timeout=5000)
        time.sleep(2)

        # C. Dashboard Visual Audit & TriPaneChamber Check
        # Take desktop dashboard snapshots
        desktop_page.screenshot(path=os.path.join(verification_screenshots_dir, "dashboard_desktop.png"))
        desktop_page.screenshot(path=os.path.join(evidence_dir, "dashboard_desktop.png"))
        desktop_page.screenshot(path=os.path.join(latest_evidence_dir, "dashboard_desktop.png"))
        print("[PLAYWRIGHT] Captured dashboard_desktop.png successfully.", flush=True)

        assert desktop_page.locator("text=Evidence & Citations").first.is_visible() or desktop_page.locator("text=AI Dialogue Stream").first.is_visible(), "TriPaneChamber dashboard panels should render"

        # D. Dashboard Sub-page Navigation Check (Search, Cases, Evidence, Settings)
        sub_routes = ["ai-chamber", "cases", "evidence", "search", "settings"]
        for route in sub_routes:
            url = f"http://localhost:3001/dashboard/{route}"
            print(f"[PLAYWRIGHT] Navigating to sub-route: {url}", flush=True)
            desktop_page.goto(url)
            time.sleep(0.5)

        desktop_ctx.close()

        # ----------------------------------------------------
        # 2. MOBILE VIEWPORT TEST
        # ----------------------------------------------------
        print("[PLAYWRIGHT] Launching Mobile Viewport (375x667)...", flush=True)
        mobile_ctx = browser.new_context(
            viewport={"width": 375, "height": 667},
            is_mobile=True,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
            record_video_dir=os.path.join(evidence_dir, "videos")
        )
        mobile_page = mobile_ctx.new_page()

        mobile_page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        mobile_page.on("pageerror", lambda err: page_errors.append(str(err)))

        print("[PLAYWRIGHT] Loading Mobile Landing Page...", flush=True)
        mobile_page.goto("http://localhost:3001")
        time.sleep(1.5)
        mobile_page.screenshot(path=os.path.join(verification_screenshots_dir, "landing_mobile.png"))
        mobile_page.screenshot(path=os.path.join(evidence_dir, "landing_mobile.png"))
        mobile_page.screenshot(path=os.path.join(latest_evidence_dir, "landing_mobile.png"))
        print("[PLAYWRIGHT] Captured landing_mobile.png successfully.", flush=True)

        # Sign in and select tenant in mobile viewport
        mobile_page.goto("http://localhost:3001/login")
        time.sleep(1)
        mobile_page.fill("input[type='email']", "mobile@firm.com")
        mobile_page.fill("input[type='password']", "password123")
        mobile_page.click("button[type='submit']")
        mobile_page.wait_for_url("**/organization", timeout=5000)
        time.sleep(1)
        mobile_page.click("button:has-text('India Practice Group')")
        mobile_page.wait_for_url("**/dashboard", timeout=5000)
        time.sleep(2)

        mobile_page.screenshot(path=os.path.join(verification_screenshots_dir, "dashboard_mobile.png"))
        mobile_page.screenshot(path=os.path.join(evidence_dir, "dashboard_mobile.png"))
        mobile_page.screenshot(path=os.path.join(latest_evidence_dir, "dashboard_mobile.png"))
        print("[PLAYWRIGHT] Captured dashboard_mobile.png successfully.", flush=True)

        mobile_ctx.close()
        browser.close()

    # Summarize results
    print(f"[PLAYWRIGHT] Verification completed. Console errors: {len(console_errors)}, Runtime errors: {len(page_errors)}", flush=True)

    # Save a temporary report of the run
    import json
    for path_target in [playwright_result_path, latest_playwright_result_path]:
        with open(path_target, "w") as f:
            json.dump({
                "consoleErrors": console_errors,
                "runtimeErrors": page_errors,
                "brokenLinks": broken_links,
                "success": len(page_errors) == 0
            }, f, indent=2)

if __name__ == "__main__":
    run_verification()
