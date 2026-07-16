import sys
import time
import os
from playwright.sync_api import sync_playwright

def run_forensics():
    print("[FORENSICS] Initializing headless Playwright investigator...", flush=True)

    os.makedirs("reports/forensics", exist_ok=True)

    console_logs = []
    network_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()

        # Wire up strict logging listeners
        page.on("console", lambda msg: console_logs.append(f"[{msg.type.upper()}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[JS_EXCEPTION] {err}"))
        page.on("requestfailed", lambda req: network_logs.append(f"FAILED_REQ: {req.method} {req.url} - {req.failure if req.failure else 'Unknown'}"))
        page.on("response", lambda res: network_logs.append(f"RES: {res.status} {res.url}") if res.status >= 400 else None)

        # Define the routes to test
        routes = [
            ("1_landing", "http://localhost:3001/"),
            ("2_features", "http://localhost:3001/features"),
            ("3_solutions", "http://localhost:3001/solutions"),
            ("4_pricing", "http://localhost:3001/pricing"),
            ("5_about", "http://localhost:3001/about"),
            ("6_contact", "http://localhost:3001/contact"),
            ("7_signin", "http://localhost:3001/login")
        ]

        # Step A: Scan Public Routes
        for name, url in routes:
            print(f"\n[FORENSICS] Opening Route: {name} -> {url}", flush=True)
            try:
                page.goto(url, wait_until="networkidle", timeout=10000)
                time.sleep(1)
                page.screenshot(path=f"reports/forensics/{name}_loaded.png")

                # Dynamic Interactor: find links/buttons/CTAs and simulate interaction
                buttons = page.locator("button, a, input[type='submit']").all()
                print(f"[FORENSICS] Found {len(buttons)} interactive elements on {name}", flush=True)

                for idx, btn in enumerate(buttons[:10]):  # Limit to top 10 elements to prevent infinite loops
                    try:
                        text = btn.inner_text().strip() or btn.get_attribute("placeholder") or f"Element_{idx}"
                        text_clean = "".join([c if c.isalnum() else "_" for c in text])[:30]
                        print(f"  -> Clicking item: '{text}'", flush=True)
                        btn.click(timeout=2000)
                        time.sleep(0.5)
                        page.screenshot(path=f"reports/forensics/{name}_click_{idx}_{text_clean}.png")

                        # Go back if we navigated away to keep scanning public page
                        if page.url != url and "login" not in url:
                            page.goto(url, wait_until="networkidle")
                            time.sleep(0.5)
                    except Exception as click_err:
                        print(f"     [Info] Interaction skipped: {click_err}", flush=True)
            except Exception as load_err:
                print(f"🔴 [FORENSICS] Error loading {name}: {load_err}", flush=True)
                page.screenshot(path=f"reports/forensics/{name}_error.png")

        # Step B: Perform Authenticated Flow (Login)
        print("\n[FORENSICS] Opening Login Route for Auth Transition...", flush=True)
        try:
            page.goto("http://localhost:3001/login", wait_until="networkidle")
            page.fill("input[type='email']", "admin@firm.com")
            page.fill("input[type='password']", "password123")
            page.screenshot(path="reports/forensics/7_signin_fields_filled.png")
            page.click("button[type='submit']")
            time.sleep(1)

            # Step 8: Organization Workspace Selection
            page.wait_for_url("**/organization", timeout=5000)
            page.screenshot(path="reports/forensics/8_organization_loaded.png")
            print("[FORENSICS] Organization context page loaded. Clicking Practice Group context...", flush=True)

            page.click("button:has-text('India Practice Group')")
            time.sleep(1)

            # Step 9: Dashboard Loading
            page.wait_for_url("**/dashboard", timeout=5000)
            page.screenshot(path="reports/forensics/9_dashboard_loaded.png")
            print("[FORENSICS] Dashboard Workspace successfully bound.", flush=True)

            # Navigate Authenticated sub-routes
            auth_routes = [
                ("10_matters", "http://localhost:3001/dashboard/cases"), # Cases serve as Matters
                ("11_cases", "http://localhost:3001/dashboard/cases"),
                ("12_evidence", "http://localhost:3001/dashboard/evidence"),
                ("13_ai_chamber", "http://localhost:3001/dashboard/ai-chamber"),
                ("14_draft_builder", "http://localhost:3001/dashboard/draft-builder"),
                ("15_search", "http://localhost:3001/dashboard/search"),
                ("17_settings", "http://localhost:3001/dashboard/settings")
            ]

            for auth_name, auth_url in auth_routes:
                print(f"\n[FORENSICS] Opening Authenticated Route: {auth_name} -> {auth_url}", flush=True)
                page.goto(auth_url, wait_until="networkidle")
                time.sleep(1)
                page.screenshot(path=f"reports/forensics/{auth_name}_loaded.png")

                # Dynamic Interactor for dashboard panels
                buttons = page.locator("button, a, .card").all()
                for idx, btn in enumerate(buttons[:8]):
                    try:
                        text = btn.inner_text().strip() or f"Element_{idx}"
                        text_clean = "".join([c if c.isalnum() else "_" for c in text])[:30]
                        print(f"  -> Clicking panel item: '{text}'", flush=True)
                        btn.click(timeout=2000)
                        time.sleep(0.5)
                        page.screenshot(path=f"reports/forensics/{auth_name}_click_{idx}_{text_clean}.png")
                    except Exception as click_err:
                        pass

            # Step 16: Notifications Panel Check
            print("\n[FORENSICS] Opening Notifications trigger check under Settings/Dashboard...", flush=True)
            page.goto("http://localhost:3001/dashboard/settings", wait_until="networkidle")
            time.sleep(1)
            # Try to trigger notification options or tab if present
            page.screenshot(path="reports/forensics/16_notifications_scan.png")

            # Step 18: Admin 404 Verification
            print("\n[FORENSICS] Opening Admin Page (Expected 404)...", flush=True)
            page.goto("http://localhost:3001/admin", wait_until="networkidle")
            time.sleep(1)
            page.screenshot(path="reports/forensics/18_admin_404_loaded.png")

            # Step 19: System Redirect Verification (Access dashboard without session)
            print("\n[FORENSICS] Checking System Redirect (unauthenticated dashboard access)...", flush=True)
            ctx_guest = browser.new_context()
            page_guest = ctx_guest.new_page()
            page_guest.goto("http://localhost:3001/dashboard", wait_until="networkidle")
            time.sleep(1)
            page_guest.screenshot(path="reports/forensics/19_system_redirect_dashboard.png")
            ctx_guest.close()

            # Step 20: Logout Verification
            print("\n[FORENSICS] Triggering session Logout...", flush=True)
            page.goto("http://localhost:3001/dashboard/settings", wait_until="networkidle")
            # Click logout link if visible
            logout_btn = page.locator("a:has-text('Logout'), button:has-text('Logout')").first
            if logout_btn.is_visible():
                logout_btn.click()
                time.sleep(1)
                page.screenshot(path="reports/forensics/20_logout_landing.png")
            else:
                # Force fallback navigate to login
                page.goto("http://localhost:3001/login")
                time.sleep(1)
                page.screenshot(path="reports/forensics/20_logout_fallback_login.png")

        except Exception as auth_err:
            print(f"🔴 [FORENSICS] Auth chain failure: {auth_err}", flush=True)
            page.screenshot(path="reports/forensics/auth_chain_failure.png")

        browser.close()

    print("\n--- FORENSICS BROWSER CONSOLE OUTPUT ---")
    for log in console_logs:
        print(log)
    print("----------------------------------------\n")

    print("--- FORENSICS NETWORK LOGS (RESPONSES >= 400 & FAILURES) ---")
    for log in network_logs:
        print(log)
    print("------------------------------------------------------------\n")

if __name__ == "__main__":
    run_forensics()
