import asyncio
from services import rag_service
from dotenv import load_dotenv
import os

load_dotenv()

async def reproduce_crash():
    topic = "1.2.4 Double Displacement Reaction"
    print(f"Testing generation for topic: {topic}")
    
    async def progress_callback(status, details=None):
        print(f"[PROGRESS] {status}")
        if details and "details" in details:
             print(f"[DETAILS] {details['details']}")

    try:
        questions = await rag_service.generate_quiz_questions(
            topic=topic,
            subject_name="Science", 
            grade_level="Grade 10",
            difficulty="Medium",
            count=5,
            progress_callback=progress_callback
        )
        print(f"Success! Generated {len(questions)} questions.")
        for q in questions:
            print(f"- {q.get('text')}")
            
    except Exception as e:
        print(f"CRASH CAUGHT: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not found in env.")
    else:
        asyncio.run(reproduce_crash())
