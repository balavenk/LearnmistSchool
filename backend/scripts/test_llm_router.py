import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Ensure backend directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.llm_router import router

async def main():
    print("Testing LLM Router Fallback Chain...")
    
    # 1. Test normal (OpenAI should be default if key is present)
    print("\n--- Test 1: Normal Routing ---")
    try:
        res = await router.generate_json(
            system_prompt="You are a helpful assistant. Output valid JSON.",
            user_prompt="Return a JSON object with a single key 'status' set to 'ok', and 'provider' set to the name of the LLM you are."
        )
        print(f"Result: {res}")
    except Exception as e:
        print(f"Error: {e}")

    # 2. Test Fallback by breaking OpenAI
    print("\n--- Test 2: Fallback (Breaking OpenAI) ---")
    original_key = os.environ.get("OPENAI_API_KEY", "")
    os.environ["OPENAI_API_KEY"] = "sk-invalid-key-to-force-fallback"
    
    # Need to reset the client so it picks up the bad key
    router.providers[0]._client = None 
    
    try:
        res = await router.generate_json(
            system_prompt="You are a helpful assistant. Output valid JSON.",
            user_prompt="Return a JSON object with a single key 'status' set to 'ok', and 'provider' set to the name of the LLM you are."
        )
        print(f"Result (should be from Claude or Gemini): {res}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Restore key
        os.environ["OPENAI_API_KEY"] = original_key
        router.providers[0]._client = None

if __name__ == "__main__":
    asyncio.run(main())
