import os
import json
import asyncio
from typing import List, Dict, Callable, Awaitable
from sqlalchemy.orm import Session
from app import models, schemas
from app.services import pdf_service, rag_service
from app.services.llm_router import router

# Paths (Replicated from upload.py for now)
STORAGE_ROOT = "storage"
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORAGE_ROOT_ABS = os.path.join(BACKEND_ROOT, STORAGE_ROOT)

async def extract_questions_from_chunk(text: str) -> List[Dict]:
    """
    Uses LLM to extract structured questions from a text chunk.
    """
    prompt = f"""
    Extract all educational questions from the following text. 
    For each question, identify:
    1. Question text
    2. Question type (MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, or LONG_ANSWER)
    3. Options (if applicable) with 'text' and 'is_correct' flag
    4. Difficulty level (Easy, Medium, Hard)
    5. Points (default 1)
    6. is_answered (boolean): True if the text provides the answer to this question, False if it is just a question without a provided answer.
    
    Return a JSON object with a key "questions" containing a list of objects.
    
    Example format:
    {{
      "questions": [
        {{
          "text": "What is the capital of France?",
          "question_type": "MULTIPLE_CHOICE",
          "difficulty_level": "Easy",
          "points": 1,
          "is_answered": true,
          "options": [
            {{ "text": "Paris", "is_correct": true }},
            {{ "text": "London", "is_correct": false }}
          ]
        }},
        {{
          "text": "Explain the process of photosynthesis in detail.",
          "question_type": "LONG_ANSWER",
          "difficulty_level": "Hard",
          "points": 5,
          "is_answered": false,
          "options": []
        }}
      ]
    }}
    
    Rules:
    - If a question has multiple options, it is MULTIPLE_CHOICE.
    - If it is a Yes/No or True/False question, it is TRUE_FALSE.
    - If it requires a short written response (1-2 sentences) and has no options, it is SHORT_ANSWER.
    - If it requires a detailed or multi-sentence/paragraph written response, it is LONG_ANSWER.
    - Ensure EVERY question has a 'text' field and an 'is_answered' boolean.
    
    Text:
    {text}
    """
    
    system_prompt = "You are an expert at extracting structured educational questions from raw text. Always return valid JSON."
    
    try:
        data = await router.generate_json(system_prompt, prompt)
        return data.get("questions", [])
    except Exception as e:
        print(f"Extraction for chunk failed: {e}")
        return []

async def process_extraction(
    file_id: int, 
    db: Session, 
    progress_callback: Callable[[str], Awaitable[None]] = None
):
    """
    Full pipeline: Parse PDF -> Extract Chunks -> LLM Save to DB.
    """
    try:
        # 1. Fetch artifact
        artifact = db.query(models.FileArtifact).filter(models.FileArtifact.id == file_id).first()
        if not artifact:
            if progress_callback: await progress_callback("Error: File not found in database.")
            return

        # 2. Resolve Path
        file_path = os.path.join(STORAGE_ROOT_ABS, artifact.relative_path)
        if not os.path.exists(file_path):
            if progress_callback: await progress_callback(f"Error: File not found on disk at {file_path}")
            return

        if progress_callback: await progress_callback(f"Starting extraction for: {artifact.original_filename}")

        # 3. Parse PDF
        if progress_callback: await progress_callback("Step 1: Parsing PDF...")
        # Use larger chunk size for extraction to give LLM more context
        chunks = pdf_service.parse_pdf(file_path, chunk_size=4000) 
        if progress_callback: await progress_callback(f"Parsed {len(chunks)} chunks.")

        import string
        def _normalize_text(text: str) -> str:
            if not text: return ""
            return text.translate(str.maketrans('', '', string.punctuation)).replace(" ", "").lower()

        # 4. Extract and Save
        total_extracted = 0
        seen_questions = {} # mapping of normalized_text -> question_id

        for i, chunk in enumerate(chunks):
            if progress_callback: await progress_callback(f"Step 2: Extracting questions from chunk {i+1}/{len(chunks)}...")
            
            raw_questions = await extract_questions_from_chunk(chunk)
            
            if not raw_questions:
                continue

            for q_data in raw_questions:
                norm_text = _normalize_text(q_data.get("text", ""))
                if not norm_text:
                    continue

                if norm_text in seen_questions:
                    # Duplicate found
                    existing_id = seen_questions[norm_text]
                    new_is_answered = q_data.get("is_answered", False)
                    if new_is_answered:
                        # Attempt to merge answer information
                        existing_q = db.query(models.Question).filter(models.Question.id == existing_id).first()
                        if existing_q and not existing_q.is_answered:
                            existing_q.is_answered = True
                            
                            # Add options if existing question didn't have any
                            if not existing_q.options and q_data.get("options", []):
                                for opt_data in q_data.get("options", []):
                                    new_opt = models.QuestionOption(
                                        text=opt_data.get("text"),
                                        is_correct=opt_data.get("is_correct", False),
                                        question_id=existing_q.id
                                    )
                                    db.add(new_opt)
                    continue

                # Create Question Record
                new_q = models.Question(
                    text=q_data.get("text"),
                    question_type=q_data.get("question_type", "MULTIPLE_CHOICE"),
                    points=q_data.get("points", 1),
                    difficulty_level=q_data.get("difficulty_level", "Medium"),
                    is_bank_question=True,
                    is_answered=q_data.get("is_answered", False),
                    file_artifact_id=artifact.id,
                    school_id=artifact.school_id,
                    grade_id=artifact.grade_id,
                    subject_id=artifact.subject_id,
                    year=artifact.year
                )
                db.add(new_q)
                db.flush() # Get ID
                seen_questions[norm_text] = new_q.id

                # Create Options
                for opt_data in q_data.get("options", []):
                    new_opt = models.QuestionOption(
                        text=opt_data.get("text"),
                        is_correct=opt_data.get("is_correct", False),
                        question_id=new_q.id
                    )
                    db.add(new_opt)
                
                total_extracted += 1
            
            db.commit() # Commit per chunk to save progress
        
        # Optional: You can add other post-processing here if needed

        # 6. Update Artifact Status
        artifact.file_status = "Extracted"
        db.commit()

        if progress_callback: await progress_callback(f"DONE: Extracted {total_extracted} questions.")

    except Exception as e:
        db.rollback()
        err_msg = f"Extraction failed: {str(e)}"
        print(err_msg)
        if progress_callback: await progress_callback(err_msg)
        artifact.file_status = "Extraction Failed"
        db.commit()
