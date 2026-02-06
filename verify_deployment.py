import requests
import time
import sys

BASE_URL = "http://34.171.195.211"
API_URL = "http://34.171.195.211:8000"

def check_url(url, description):
    print(f"Checking {description} at {url}...")
    try:
        response = requests.get(url, timeout=5)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS")
            return True
        else:
            print("FAILED (Status code)")
            return False
    except Exception as e:
        print(f"FAILED (Error: {e})")
        return False

print("Starting Verification...")
# Retry loop? Or just one shot?
# Let's do a few retries
for i in range(5):
    docs_ok = check_url(f"{API_URL}/docs", "Swagger UI")
    app_ok = check_url(f"{BASE_URL}/", "Frontend Root")
    
    if docs_ok and app_ok:
        print("\nDeployment Verified!")
        sys.exit(0)
    
    print("Waiting 10s...")
    time.sleep(10)

print("\nVerification Timed Out.")
sys.exit(1)
