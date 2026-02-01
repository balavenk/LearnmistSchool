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
