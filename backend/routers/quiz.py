from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
import logging
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

import schemas, database, models
from auth import get_current_active_user
from services.vector_store import vector_store, OPENAI_API_KEY

router = APIRouter(
    prefix="/quiz",
    tags=["quiz"]
)

# Initialize LLM only if key exists
llm = None
if OPENAI_API_KEY:
    llm = ChatOpenAI(model="gpt-4", temperature=0.7, openai_api_key=OPENAI_API_KEY)

@router.post("/generate", response_model=List[schemas.QuizQuestion])
def generate_quiz(
    request: schemas.QuizRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if not llm:
        raise HTTPException(status_code=503, detail="AI Service unavailable (Missing API Key)")
        
    if not vector_store.db:
        # Fallback empty or error? Let's error for now
         raise HTTPException(status_code=400, detail="No materials trained. Please upload and train materials first.")

    # 1. Retrieve Context
    # 1. Retrieve Context
    # Filter by subject (Note: metadata keys are case-sensitive)
    filters = {"subject": request.subject}
    
    # Apply optional strict filters
    if request.limit_to_class:
        filters["Class"] = request.limit_to_class
    if request.limit_to_category:
        filters["Category"] = request.limit_to_category
    
    # Construct search query
    search_query = f"Core concepts of {request.subject}"
    if request.custom_instructions:
        search_query += f" related to {request.custom_instructions}"
        
    docs = vector_store.search(query=search_query, filters=filters, k=5)
    
    if not docs:
         # More descriptive error
         details = f"subject '{request.subject}'"
         if request.limit_to_class: details += f", class '{request.limit_to_class}'"
         if request.limit_to_category: details += f", category '{request.limit_to_category}'"
         
         raise HTTPException(status_code=404, detail=f"No trained materials found for {details}. Please ensure you have uploaded and trained a PDF with these exact tags.")

    context_text = "\n\n".join([d.page_content for d in docs])

    # 2. Generate Quiz via LLM
    prompt_template = """
    You are an expert educator creating a high-quality quiz.
    
    Subject: {subject}
    Target Audience: {difficulty} Level Students
    Count: {num} questions
    Focus/Instructions: {instructions}
    
    Instructions:
    1. Using ONLY the provided context below, generate {num} multiple-choice questions.
    2. Questions must be conceptual and test understanding, not just trivia.
    3. Provide 4 options for each question (A, B, C, D).
    4. Provide the correct answer and a brief, clear explanation.
    5. Output MUST be a valid JSON array. Do not include markdown code blocks (like ```json).
    
    Context:
    {context}
    
    JSON Structure:
    [
        {{
            "question": "Question text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Option A",
            "explanation": "Why this is correct."
        }}
    ]
    """
    
    prompt = PromptTemplate(
        input_variables=["num", "subject", "difficulty", "instructions", "context"],
        template=prompt_template
    )
    
    final_prompt = prompt.format(
        num=request.num_questions, 
        subject=request.subject, 
        difficulty=request.difficulty, 
        instructions=request.custom_instructions or "General comprehensive review",
        context=context_text
    )
    
    try:
        response = llm.invoke(final_prompt)
        content = response.content.replace("```json", "").replace("```", "").strip()
        
        quiz_data = json.loads(content)
        
        # Validate/Map to Schema (simple mapping)
        questions = []
        for i, q in enumerate(quiz_data):
            questions.append(schemas.QuizQuestion(
                id=i+1,
                question=q["question"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation", "")
            ))
            
        return questions

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

@router.post("/save", response_model=schemas.Quiz)
def save_quiz(
    quiz_data: schemas.QuizCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Verify teacher role logic if strict, but let's allow any authorized user for now
    
    db_quiz = models.Quiz(
        title=quiz_data.title,
        subject=quiz_data.subject,
        questions=quiz_data.questions, # specific questions JSON string
        teacher_id=current_user.id
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz

@router.get("/saved", response_model=List[schemas.Quiz])
def get_saved_quizzes(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Retrieve quizzes created by current user
    return db.query(models.Quiz).filter(models.Quiz.teacher_id == current_user.id).all()
