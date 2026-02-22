import os
from openai import AsyncOpenAI
from qdrant_client import QdrantClient
from qdrant_client.http import models
from typing import List, Dict, Callable, Awaitable
import uuid
import json
import asyncio

# Initialize clients (ensure env vars are set)
# OPENAI_API_KEY

async def classify_chunk(client: AsyncOpenAI, text: str) -> Dict:
    """
    Classifies the text chunk using GPT.
    """
    prompt = f"""
    You are analyzing a textbook.

    Identify whether the following text is one of:

    - Section
    - Topic
    - Subtopic
    - Example
    - Summary
    - Other

    Return JSON:
    {{
     "type": "",
     "title": "",
     "grade_level": "",
     "subject": ""
    }}

    Text:
    {text[:2000]} 
    """
    # Truncate text to avoid context limits if chunk is too huge, currently 800 tokens is fine.

    try:
        completion = await client.chat.completions.create(
            model="gpt-4o", # Or gpt-3.5-turbo if cost is concern
            messages=[
                {"role": "system", "content": "You are a helpful assistant that classifies educational content."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        content = completion.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"Classification failed: {e}")
        return {}

# Global Singleton
_qdrant_client = None

def get_qdrant_client():
    global _qdrant_client
    if _qdrant_client is None:
        # Initialize Qdrant (Local Persistent Mode)
        _qdrant_client = QdrantClient(path="qdrant_db")
    return _qdrant_client

async def process_chunks_async(
    chunks: List[str], 
    metadata: Dict, 
    collection_name: str = "learnmist-school",
    progress_callback: Callable[[str], Awaitable[None]] = None
):
    """
    Generates embeddings for chunks, classifies them, and upserts to Qdrant (Local).
    
    Args:
        chunks: List of text chunks.
        metadata: Dictionary of metadata to attach to each vector (e.g. school_id, subject).
        collection_name: Qdrant collection name.
        progress_callback: Async function to report progress.
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if not openai_api_key:
        msg = "Missing OPENAI_API_KEY. Skipping RAG processing."
        print(msg)
        if progress_callback: await progress_callback(msg)
        return

    client_openai = AsyncOpenAI(api_key=openai_api_key)
    
    # Use Singleton Client
    client_qdrant = get_qdrant_client()
    
    if progress_callback: await progress_callback(f"Connected to Qdrant at 'qdrant_db'. Checking collection '{collection_name}'...")

    # Ensure collection exists
    if not client_qdrant.collection_exists(collection_name):
        client_qdrant.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(size=3072, distance=models.Distance.COSINE) # text-embedding-3-large is 3072d
        )
        if progress_callback: await progress_callback(f"Created new collection '{collection_name}'.")

    if progress_callback: await progress_callback(f"Starting processing of {len(chunks)} chunks...")

    # Batch processing
    batch_size = 50 
    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i:i + batch_size]
        batch_num = i//batch_size + 1
        
        try:
            if progress_callback: await progress_callback(f"Batch {batch_num}: Starting classification for {len(batch_chunks)} chunks...")
            
            # 1. Classify Chunks 
            classified_chunks_metadata = []
            for idx, chunk in enumerate(batch_chunks):
                # Optionally report individual chunk progress? Might be too chatty.
                # if progress_callback: await progress_callback(f"Batch {batch_num}: Classifying chunk {idx+1}/{len(batch_chunks)}...")
                classification = await classify_chunk(client_openai, chunk)
                classified_chunks_metadata.append(classification)
            
            if progress_callback: await progress_callback(f"Batch {batch_num}: Classification done. Generating embeddings...")

            # 2. Generate Embeddings
            response = await client_openai.embeddings.create(
                input=batch_chunks,
                model="text-embedding-3-large"
            )
            embeddings = [data.embedding for data in response.data]
            
            if progress_callback: await progress_callback(f"Batch {batch_num}: Embeddings generated. Upserting to Qdrant...")

            # 3. Prepare Points
            points = []
            for j, embedding in enumerate(embeddings):
                chunk_text = batch_chunks[j]
                chunk_classification = classified_chunks_metadata[j]
                
                # Combine base metadata + classification + chunk text
                point_payload = metadata.copy()
                point_payload.update(chunk_classification)
                point_payload['text'] = chunk_text 
                
                point_id = str(uuid.uuid4())
                points.append(models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=point_payload
                ))
            
            # 4. Upsert
            client_qdrant.upsert(
                collection_name=collection_name,
                points=points
            )
            
            msg = f"Batch {batch_num}: Successfully upserted {len(points)} vectors."
            print(msg)
            if progress_callback: await progress_callback(msg)
            
        except Exception as e:
            err_msg = f"Error processing batch {i}: {e}"
            print(err_msg)
            if progress_callback: await progress_callback(err_msg)
            raise e
            
    if progress_callback: await progress_callback("All batches processed successfully.")

async def generate_quiz_questions(
    topic: str,
    subject_name: str,
    grade_level: str,
    difficulty: str,
    count: int,
    question_type: str = "Mixed",
    use_pdf_context: bool = False,
    progress_callback: Callable[[str, Dict], Awaitable[None]] = None
) -> List[Dict]:
    """
    Generates quiz questions using RAG.
    If use_pdf_context is False, skips RAG and generates from general knowledge.
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")

    if not openai_api_key:
        print("Missing OPENAI_API_KEY")
        # Try loading explicitly
        from dotenv import load_dotenv
        load_dotenv()
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not openai_api_key:
             return []
        # Re-init client
        client_openai = AsyncOpenAI(api_key=openai_api_key)
    else:
        client_openai = AsyncOpenAI(api_key=openai_api_key)

    client_qdrant = get_qdrant_client()
    collection_name = "learnmist-school"

    try:
        # 1. Embed the query (topic) - only if using PDF context
        context_text = ""
        
        if use_pdf_context:
            if progress_callback:
                await progress_callback("Creating embeddings for topic...", {"step": "embedding", "topic": topic})
                
            emb_response = await client_openai.embeddings.create(
                input=topic,
                model="text-embedding-3-large"
            )
            query_vector = emb_response.data[0].embedding

            # 2. Search Qdrant (check if collection exists first)
            if not client_qdrant.collection_exists(collection_name):
                msg = "No training materials uploaded yet. Collection not found. Using general knowledge."
                print(msg)
                context_text = msg
                if progress_callback:
                    await progress_callback("No training materials found in database.", {"step": "search_result", "info": msg})
            else:
                if progress_callback:
                    await progress_callback("Searching knowledge base...", {"step": "search", "subject": subject_name})

                # 'search' missing in current version, using query_points
                search_response = client_qdrant.query_points(
                    collection_name=collection_name,
                    query=query_vector,
                    limit=5,
                    query_filter=models.Filter(
                        should=[
                            models.FieldCondition(
                                key="subject",
                                match=models.MatchValue(value=subject_name)
                            ),
                            models.FieldCondition(
                                key="subject_name", # Try alternate key just in case
                                match=models.MatchValue(value=subject_name)
                            )
                        ]
                    )
                )
                search_results = search_response.points
                
                for hit in search_results:
                    context_text += f"{hit.payload.get('text', '')}\n\n"

                if not context_text:
                    msg = "No specific textbook context found. Using general knowledge."
                    print(msg)
                    context_text = msg
                    if progress_callback:
                         await progress_callback("No direct matches found.", {"step": "search_result", "info": msg})
                else:
                     if progress_callback:
                         await progress_callback(f"Found {len(search_results)} relevant chunks.", {"step": "search_result", "chunks_found": len(search_results)})
        else:
            # Skip RAG, use general knowledge
            context_text = "Using general knowledge base (no PDF/textbook context)."
            if progress_callback:
                await progress_callback("Generating from general knowledge (PDF context disabled).", {"step": "search_result", "info": context_text})

        normalized_question_type = (question_type or "Mixed").strip()
        question_type_map = {
            "Multiple Choice": "MULTIPLE_CHOICE",
            "True/False": "TRUE_FALSE",
            "Short Answer": "SHORT_ANSWER",
            "Mixed": "MIXED",
            "MULTIPLE_CHOICE": "MULTIPLE_CHOICE",
            "TRUE_FALSE": "TRUE_FALSE",
            "SHORT_ANSWER": "SHORT_ANSWER",
            "MIXED": "MIXED",
        }
        normalized_question_type = question_type_map.get(normalized_question_type, "MIXED")

        question_type_instruction = "You may generate a mix of MULTIPLE_CHOICE, TRUE_FALSE, and SHORT_ANSWER questions."
        if normalized_question_type == "TRUE_FALSE":
            question_type_instruction = "Generate ONLY TRUE_FALSE questions. Do not generate MULTIPLE_CHOICE or SHORT_ANSWER questions."
        elif normalized_question_type == "MULTIPLE_CHOICE":
            question_type_instruction = "Generate ONLY MULTIPLE_CHOICE questions. Do not generate TRUE_FALSE or SHORT_ANSWER questions."
        elif normalized_question_type == "SHORT_ANSWER":
            question_type_instruction = "Generate ONLY SHORT_ANSWER questions. Do not generate MULTIPLE_CHOICE or TRUE_FALSE questions."

        # 3. Generate Questions via LLM
        prompt = f"""
        You are a teacher creating a quiz.
        
        Topic: {topic}
        Subject: {subject_name}
        Grade Level: {grade_level}
        Difficulty: {difficulty}
        Number of Questions: {count}
        Requested Question Type: {normalized_question_type}
        Type Rule: {question_type_instruction}
        
        Context from textbooks:
        {context_text[:10000]} # Limit context size
        
        Generate {count} questions in strict JSON format.
        The output must be a JSON object with a key "questions" containing a list of questions.
        
        Each question object must look like this:
        {{
            "text": "Question text",
            "question_type": "MULTIPLE_CHOICE", # or TRUE_FALSE, SHORT_ANSWER
            "points": 5,
            "options": [
                {{ "text": "Option 1", "is_correct": false }},
                {{ "text": "Option 2", "is_correct": true }}
            ]
        }}
        
        For TRUE_FALSE, provide exactly two options: True and False.
        For SHORT_ANSWER, provide one option with is_correct=true containing the intended answer.
        """
        
        if progress_callback:
            await progress_callback("Generating questions with OpenAI...", {"step": "llm_request", "prompt_preview": prompt[:200] + "..."})

        # Choose system prompt based on whether PDF context is being used
        if use_pdf_context:
            system_prompt = (
                "You must generate questions ONLY from the provided book content.\n"
                "Use exclusively the information contained in the supplied context.\n\n"
                "Do NOT use prior knowledge.\n"
                "Do NOT add external facts.\n"
                "Do NOT infer beyond what is explicitly written.\n"
                "If the answer cannot be found in the provided text, respond with:\n"
                "\"Insufficient information in provided material.\"\n\n"
                "Output valid JSON only."
            )
        else:
            system_prompt = "You are a helpful educational assistant. Output valid JSON only."

        completion = await client_openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        content = completion.choices[0].message.content
        
        if progress_callback:
             await progress_callback("Received response from OpenAI.", {"step": "llm_response", "raw_content_preview": content[:200] + "..."})
             
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # Attempt to clean markdown
            cleaned_content = content.strip()
            if cleaned_content.startswith("```json"):
                cleaned_content = cleaned_content[7:]
            if cleaned_content.startswith("```"):
                cleaned_content = cleaned_content[3:]
            if cleaned_content.endswith("```"):
                cleaned_content = cleaned_content[:-3]
            cleaned_content = cleaned_content.strip()
            
            try:
                data = json.loads(cleaned_content)
            except json.JSONDecodeError as e:
                print(f"JSON Parse Error: {e}")
                print(f"Raw Content: {content}")
                if progress_callback:
                     await progress_callback(f"Failed to parse AI response. Raw: {content[:100]}...", {"step": "error", "details": "JSON Parse Error"})
                return []

        questions = data.get("questions", [])
        
        if progress_callback:
             await progress_callback(f"Successfully generated {len(questions)} questions.", {"step": "complete", "questions_count": len(questions)})
             
        return questions

    except Exception as e:
        import traceback
        traceback.print_exc()
        if progress_callback:
             await progress_callback(f"Error: {str(e)}", {"step": "error", "details": str(e)})
        print(f"Quiz generation failed: {e}")
        return []
