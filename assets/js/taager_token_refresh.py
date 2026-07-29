# -*- coding: utf-8 -*-
import json, sys, io, os, subprocess, time, base64, re

FORCE = "--force" in sys.argv
INTERACTIVE = "--interactive" in sys.argv
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PROJECT_DIR = r"C:\Users\BODa\Documents\Date bsnas Home BODA\موقع الخاص بك"
LOG_FILE = os.path.join(PROJECT_DIR, "taager_refresh.log")
PROFILE_DIR = os.path.join(os.environ["TEMP"], "opencode", "chrome-profile")
SUPABASE_CLI = r"C:\Users\BODa\AppData\Roaming\npm\supabase.cmd"

os.environ["PATH"] += os.pathsep + r"C:\Users\BODa\AppData\Roaming\npm" + os.pathsep + r"C:\Program Files\nodejs"
os.environ["SUPABASE_TELEMETRY_DISABLED"] = "1"

def log(msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} - {msg}\n")
    print(msg)

def decode_jwt(token):
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(payload_b64))
    except:
        return None

def token_remaining_seconds(token):
    payload = decode_jwt(token)
    if not payload or "exp" not in payload:
        return -1
    return float(payload["exp"]) - time.time()

def has_fresh_token(token, min_remaining=300):
    return token_remaining_seconds(token) > min_remaining

def check_current_token():
    try:
        os.chdir(PROJECT_DIR)
        proc = subprocess.run(f"{SUPABASE_CLI} secrets list", shell=True, capture_output=True, text=True, timeout=15000, encoding="utf-8")
        for line in proc.stdout.split("\n"):
            if "TAAGER_JWT_TOKEN" in line:
                token_val = line.strip().split()[-1]
                payload = decode_jwt(token_val)
                if payload and "exp" in payload:
                    remaining = payload["exp"] - time.time()
                    log(f"Current token expires in {remaining/3600:.1f}h")
                    return remaining > 14400
        return False
    except Exception as e:
        log(f"Could not check token: {e}")
        return False

def build_driver(headless=True):
    opts = Options()
    if headless:
        opts.add_argument("--headless")
    opts.add_argument("--window-size=1280,720")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument(f"--user-data-dir={PROFILE_DIR}")
    opts.add_argument("--profile-directory=Default")
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)

def extract_token(driver):
    return driver.execute_script("""
        try {
            const raw = localStorage.getItem('tgr--usr');
            if (!raw) return null;
            const data = JSON.parse(raw).data || {};
            const sessionRaw = localStorage.getItem('tgr--usr-s');
            const sessionKey = sessionRaw ? JSON.parse(sessionRaw).data || '' : '';
            return {
                accessToken: data.accessToken || '',
                taagerId: String(data.id || ''),
                sessionKey: sessionKey,
                email: data.email || ''
            };
        } catch(e) { return null; }
    """)

if not FORCE and not INTERACTIVE and check_current_token():
    log("Token still valid, skipping")
    sys.exit(0)

log("Opening Chrome...")
driver = build_driver(headless=not INTERACTIVE)
driver.get("https://taager.com")
time.sleep(5)
result = extract_token(driver)

if INTERACTIVE or not result or not has_fresh_token(result.get("accessToken", "")):
    log("Not logged in. Opening visible browser for manual login...")
    driver.quit()
    driver = build_driver(headless=False)
    driver.get("https://taager.com")
    log("Please log in via Google in the browser window or refresh Taager session")
    log("Waiting up to 5 minutes...")
    for i in range(150):
        time.sleep(2)
        result = extract_token(driver)
        if result and has_fresh_token(result.get("accessToken", "")):
            log("Login detected!")
            break
        if i % 15 == 0:
            log(f"  Waiting... ({i*2}s)")

try:
    if result and has_fresh_token(result.get("accessToken", "")):
        token = result["accessToken"]
        taager_id = result["taagerId"]
        session_key = result["sessionKey"]
        email = result["email"]
        payload = decode_jwt(token)
        exp_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(payload["exp"])) if payload else "unknown"
        log(f"Token refreshed for {email}, expires {exp_str}")
        os.chdir(PROJECT_DIR)
        proc = subprocess.run(
            f'{SUPABASE_CLI} secrets set TAAGER_JWT_TOKEN="{token}" TAAGER_TAAGER_ID={taager_id} TAAGER_SESSION_KEY={session_key}',
            shell=True, capture_output=True, text=True, timeout=30000, encoding="utf-8"
        )
        if proc.returncode == 0:
            log("Supabase secrets updated!")
            log("لم يعد script يكتب المفاتيح في auth.config.js - الملف الأمامي لم يعد يحتوي على مفاتيح.")
        else:
            log(f"Failed: {proc.stderr}")
    else:
        log("Could not get a fresh token")
except Exception as e:
    log(f"Error: {e}")
finally:
    driver.quit()
    log("Browser closed")
    log("=" * 50)
