import os
import openai
from qdrant_client import QdrantClient
from qdrant_client.http import models
from typing import List, Dict
import uuid

# Initialize clients (ensure env vars are set)
# OPENAI_API_KEY

def process_chunks(chunks: List[str], metadata: Dict, collection_name: str = "learnmist-school"):
    """
    Generates embeddings for chunks and upserts them to Qdrant (Local).
    
    Args:
        chunks: List of text chunks.
        metadata: Dictionary of metadata to attach to each vector (e.g. school_id, subject).
        collection_name: Qdrant collection name.
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if not openai_api_key:
        print("Missing OPENAI_API_KEY. Skipping RAG processing.")
        return

    openai.api_key = openai_api_key
    
    # Initialize Qdrant (Local Persistent Mode)
    # This creates a folder named 'qdrant_db' in the current working directory
    client = QdrantClient(path="qdrant_db")
    
    # Ensure collection exists
    if not client.collection_exists(collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(size=3072, distance=models.Distance.COSINE) # text-embedding-3-large is 3072d
        )

    # Batch processing
    batch_size = 50 # Slightly smaller batch for local DB safety if needed
    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i:i + batch_size]
        
        try:
            # Generate Embeddings
            response = openai.embeddings.create(
                input=batch_chunks,
                model="text-embedding-3-large"
            )
            embeddings = [data.embedding for data in response.data]
            
            # Prepare Points
            points = []
            for j, embedding in enumerate(embeddings):
                chunk_text = batch_chunks[j]
                # Combine base metadata with chunk-specific text
                point_payload = metadata.copy()
                point_payload['text'] = chunk_text 
                
                point_id = str(uuid.uuid4())
                points.append(models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=point_payload
                ))
            
            # Upsert
            client.upsert(
                collection_name=collection_name,
                points=points
            )
            print(f"Upserted batch {i//batch_size + 1} to Qdrant")
            
        except Exception as e:
            print(f"Error processing batch {i}: {e}")
            raise e
