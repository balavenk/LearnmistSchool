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
    1. Question text: Include the full context, including any preamble statements (e.g. Statement I, Statement II, or A, B, C statements) that are part of the question logic.
    2. Question type (MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, or LONG_ANSWER)
    3. Options (if applicable) with 'text' and 'is_correct' flag. These should be the final choices the student picks from (e.g. 'A and B', 'Only C', etc.).
    4. Difficulty level (Easy, Medium, Hard)
    5. Points (default 1)
    6. is_answered (boolean): True if the text provides the answer to this question.
    
    CRITICAL RULE for Multi-Part Questions:
    If a question has a list of statements (A, B, C) followed by final choices (A, B, C, D), you MUST include the statements (A, B, C) in the "text" field, and only use the final choices as "options".
    
    Return a JSON object with a key "questions" containing a list of objects.
    
    Example format:
    {{
      "questions": [
        {{
          "text": "Which of the following are true about the heart?\\n(1) It has four chambers.\\n(2) It pumps deoxygenated blood to the lungs.\\n(3) It is located in the abdominal cavity.",
          "question_type": "MULTIPLE_CHOICE",
          "difficulty_level": "Medium",
          "points": 1,
          "is_answered": true,
          "options": [
            {{ "text": "(1) and (2) only", "is_correct": true }},
            {{ "text": "(2) and (3) only", "is_correct": false }}
          ]
        }}
      ]
    }}
    
    Rules:
    - If a question has multiple options, it is MULTIPLE_CHOICE.
    - If it is a Yes/No or True/False question, it is TRUE_FALSE.
    - If it requires a short response and has no options, it is SHORT_ANSWER.
    - Use newline (\\n) to separate parts of the question text for readability.
    
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
            
        if artifact.file_status == "Extracting":
            if progress_callback: await progress_callback("INFO: Extraction already in progress. Skipping duplicate run.")
            return

        # Mark as Extracting immediately to prevent concurrent runs
        artifact.file_status = "Extracting"
        db.commit()
        db.refresh(artifact)

        # 2. Resolve Path
        file_path = os.path.join(STORAGE_ROOT_ABS, artifact.relative_path)
        if not os.path.exists(file_path):
            if progress_callback: await progress_callback(f"Error: File not found on disk at {file_path}")
            return

        if progress_callback: await progress_callback(f"Starting extraction for: {artifact.original_filename}")

        # 3. Parse PDF
        if progress_callback: await progress_callback("Step 1: Parsing PDF...")
        
        # Cleanup existing questions to prevent duplicates on re-extraction
        db.query(models.QuestionOption).filter(
            models.QuestionOption.question_id.in_(
                db.query(models.Question.id).filter(models.Question.file_artifact_id == file_id)
            )
        ).delete(synchronize_session=False)
        db.query(models.Question).filter(models.Question.file_artifact_id == file_id).delete(synchronize_session=False)
        db.commit()

        # Use larger chunk size for extraction to give LLM more context
        chunks = pdf_service.parse_pdf(file_path, chunk_size=4000) 
        if progress_callback: await progress_callback(f"Parsed {len(chunks)} chunks.")

        import string
        import re
        def _normalize_text(text: str) -> str:
            if not text: return ""
            # Strongly strip prefixes: 1. Q1. (1) (a) Q: etc.
            text = re.sub(r'^(?:\d+[.\)]\s*|[a-z][.\)]\s*|Q\d*[:.]?\s*|\(\s*[a-z\d]+\s*\)[:.)\s-]*)', '', text.strip(), flags=re.IGNORECASE)
            # Super-aggressive normalization: remove ALL non-alphanumeric, spaces, and lowercase
            # This handles different punctuation, smart quotes, extra spaces, etc.
            return re.sub(r'[^a-zA-Z0-9]', '', text).lower()

        # 4. Extract and Save
        total_extracted = 0
        
        # Populate seen_questions with EVERYTHING already in the bank for this context
        # to prevent duplicates across different file uploads
        existing_questions = db.query(models.Question).filter(
            models.Question.school_id == artifact.school_id,
            models.Question.subject_id == artifact.subject_id,
            models.Question.grade_id == artifact.grade_id
        ).all()
        
        seen_questions = {
            _normalize_text(q.text): q.id for q in existing_questions if q.text
        } # mapping of normalized_text -> question_id

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
                    year=artifact.year,
                    source_year=str(artifact.year) if artifact.year else None,
                    source_type="Manual"
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
