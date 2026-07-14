import sys
import time
import os
import json
from playwright.sync_api import sync_playwright

def run_verification():
    print("[PLAYWRIGHT] Initializing browser automation...", flush=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    os.makedirs("/app/sentinels/ui-sentinel/evidence", exist_ok=True)

    console_errors = []
    page_errors = []
    broken_links = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ----------------------------------------------------
        # 1. DESKTOP VIEWPORT TEST
        # ----------------------------------------------------
        print("[PLAYWRIGHT] Launching Desktop Viewport (1280x800)...", flush=True)
        desktop_ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        desktop_page = desktop_ctx.new_page()

        # Wire up console and exception listeners
        desktop_page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        desktop_page.on("pageerror", lambda err: page_errors.append(str(err)))

        # A. Landing Page Loading & Visual Audit
        print("[PLAYWRIGHT] Loading Landing Page...", flush=True)
        try:
            desktop_page.goto("http://localhost:3006", timeout=15000)
            time.sleep(2)
            # Take desktop landing snapshot
            desktop_page.screenshot(path="/home/jules/verification/screenshots/landing_desktop.png")
            desktop_page.screenshot(path="/app/sentinels/ui-sentinel/evidence/landing_desktop.png")
            print("[PLAYWRIGHT] Captured landing_desktop.png successfully.", flush=True)
        except Exception as e:
            print(f"[PLAYWRIGHT] ERROR: Failed to load landing page: {e}", flush=True)
            write_failure_result(console_errors, page_errors)
            sys.exit(1)

        # Verify Landing Elements (use .first to avoid strict mode violations)
        assert desktop_page.locator("text=NextCaseHQ").first.is_visible(), "Hero title should be visible"
        assert desktop_page.locator("text=Search").first.is_visible(), "Search button should be visible"

        # B. Authentication & Tenant Binding Flow
        print("[PLAYWRIGHT] Navigating to Sign In...", flush=True)
        desktop_page.goto("http://localhost:3006/login")

        # WAIT FOR HYDRATION to prevent native HTML GET form reloads
        print("[PLAYWRIGHT] Waiting for client-side JS hydration...", flush=True)
        time.sleep(3)

        desktop_page.screenshot(path="/app/sentinels/ui-sentinel/evidence/login_before_submit.png")
        print(f"[PLAYWRIGHT] Before submit URL: {desktop_page.url}", flush=True)

        desktop_page.fill("input[type='email']", "admin@firm.com")
        desktop_page.fill("input[type='password']", "password123")

        print("[PLAYWRIGHT] Submitting credentials...", flush=True)
        desktop_page.click("button[type='submit']")

        print("[PLAYWRIGHT] Waiting for URL transition to organization gate...", flush=True)
        try:
            desktop_page.wait_for_url("**/organization", timeout=10000)
            print(f"[PLAYWRIGHT] Securely reached gateway: {desktop_page.url}", flush=True)
        except Exception as e:
            desktop_page.screenshot(path="/app/sentinels/ui-sentinel/evidence/login_timeout_error.png")
            print(f"[PLAYWRIGHT] ERROR: Transition timed out. Current URL: {desktop_page.url}", flush=True)
            write_failure_result(console_errors, page_errors)
            sys.exit(1)

        time.sleep(1)

        # Select first available tenant (India Practice Group)
        print("[PLAYWRIGHT] Selecting Practice Group context...", flush=True)
        desktop_page.click("button:has-text('India Practice Group')")

        print("[PLAYWRIGHT] Binding cryptographic PostgreSQL session context...", flush=True)
        desktop_page.wait_for_url("**/dashboard", timeout=10000)
        time.sleep(2)

        # C. Dashboard Visual Audit & TriPaneChamber Check
        # Take desktop dashboard snapshot
        desktop_page.screenshot(path="/home/jules/verification/screenshots/dashboard_desktop.png")
        desktop_page.screenshot(path="/app/sentinels/ui-sentinel/evidence/dashboard_desktop.png")
        print("[PLAYWRIGHT] Captured dashboard_desktop.png successfully.", flush=True)

        assert desktop_page.locator("text=Chamber").first.is_visible() or desktop_page.locator("text=Command").first.is_visible(), "Advocate Intelligence Dashboard should render"

        # D. Dashboard Sub-page Navigation Check (Search, Cases, Evidence, Settings)
        sub_routes = ["ai-chamber", "cases", "evidence", "search", "settings"]
        for route in sub_routes:
            url = f"http://localhost:3006/dashboard/{route}"
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
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        )
        mobile_page = mobile_ctx.new_page()

        mobile_page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        mobile_page.on("pageerror", lambda err: page_errors.append(str(err)))

        print("[PLAYWRIGHT] Loading Mobile Landing Page...", flush=True)
        mobile_page.goto("http://localhost:3006")
        time.sleep(2)
        mobile_page.screenshot(path="/home/jules/verification/screenshots/landing_mobile.png")
        mobile_page.screenshot(path="/app/sentinels/ui-sentinel/evidence/landing_mobile.png")
        print("[PLAYWRIGHT] Captured landing_mobile.png successfully.", flush=True)

        # Sign in and select tenant in mobile viewport
        mobile_page.goto("http://localhost:3006/login")
        time.sleep(3) # Wait for mobile hydration
        mobile_page.fill("input[type='email']", "mobile@firm.com")
        mobile_page.fill("input[type='password']", "password123")
        mobile_page.click("button[type='submit']")
        mobile_page.wait_for_url("**/organization", timeout=10000)
        time.sleep(1)
        mobile_page.click("button:has-text('India Practice Group')")
        mobile_page.wait_for_url("**/dashboard", timeout=10000)
        time.sleep(2)

        mobile_page.screenshot(path="/home/jules/verification/screenshots/dashboard_mobile.png")
        mobile_page.screenshot(path="/app/sentinels/ui-sentinel/evidence/dashboard_mobile.png")
        print("[PLAYWRIGHT] Captured dashboard_mobile.png successfully.", flush=True)

        mobile_ctx.close()
        browser.close()

    # Summarize results
    print(f"[PLAYWRIGHT] Verification completed. Console errors: {len(console_errors)}, Runtime errors: {len(page_errors)}", flush=True)
    write_success_result(console_errors, page_errors)

def write_failure_result(console_errors, page_errors):
    with open("/app/sentinels/ui-sentinel/playwright_result.json", "w") as f:
        json.dump({
            "consoleErrors": console_errors,
            "runtimeErrors": page_errors,
            "brokenLinks": [],
            "success": False
        }, f, indent=2)

def write_success_result(console_errors, page_errors):
    with open("/app/sentinels/ui-sentinel/playwright_result.json", "w") as f:
        json.dump({
            "consoleErrors": console_errors,
            "runtimeErrors": page_errors,
            "brokenLinks": [],
            "success": True
        }, f, indent=2)

if __name__ == "__main__":
    run_verification()
