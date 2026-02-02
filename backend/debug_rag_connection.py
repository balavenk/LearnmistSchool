import os
import sys
import asyncio
from dotenv import load_dotenv

# Add current dir to path to import services
sys.path.append(os.getcwd())

load_dotenv()

from services import rag_service

async def main():
    print("--- Debugging RAG Configuration ---")
    
    # 1. Check API Key
    key = os.getenv("OPENAI_API_KEY")
    if key:
        print(f"[OK] OPENAI_API_KEY found (Length: {len(key)})")
    else:
        print("[FAIL] OPENAI_API_KEY is MISSING in environment!")
        
    # 2. Check Qdrant Connection
    try:
        client = rag_service.get_qdrant_client()
        collections = client.get_collections()
        print(f"[OK] Connected to Qdrant. Collections: {[c.name for c in collections.collections]}")
    except Exception as e:
        print(f"[FAIL] Qdrant Connection failed: {e}")
        
    # 3. Test Generation (Mock)
    if key:
        print("\n--- Testing Generation ---")
        try:
            questions = await rag_service.generate_quiz_questions(
                topic="Test Topic",
                subject_name="General",
                grade_level="Grade 10",
                difficulty="Medium",
                count=1
            )
            print(f"[OK] Generation successful. Got {len(questions)} questions.")
            print(questions)
        except Exception as e:
            print(f"[FAIL] Generation failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
