import os
import sys
from dotenv import load_dotenv
load_dotenv()

from services.vector_store import vector_store
from database import SessionLocal
import models
import json

try:
    # Setup DB
    db = SessionLocal()

    print("--- SQL Database Files ---")
    files = db.query(models.FileArtifact).all()
    for f in files:
        print(f"ID: {f.id}, Filename: {f.filename}, Tags: {f.tags}")

    print("\n--- Vector Database Content ---")
    if vector_store.db:
        # Hack to access docstore in FAISS wrapper
        try:
            # This iterates over all docs in the store
            docstore = vector_store.db.docstore
            print(f"Total documents in vector store: {len(docstore.__dict__.get('_dict', {}))}")
            
            # Print first 5 docs metadata
            count = 0
            for k, v in docstore.__dict__.get('_dict', {}).items():
                print(f"Chunk ID: {k}")
                print(f"Metadata: {v.metadata}")
                count += 1
                if count >= 10:
                    print("... (stopping after 10 chunks)")
                    break
        except Exception as e:
            print(f"Could not inspect FAISS internals: {e}")
            # Try a broad search
            print("Attempting broad search...")
            try:
                 docs = vector_store.search("Physics", k=3)
                 for d in docs:
                     print(f"Search Result Meta: {d.metadata}")
            except Exception as se:
                print(f"Search failed: {se}")

    else:
        print("Vector DB is not initialized.")

except Exception as main_e:
    print(f"CRITICAL ERROR: {main_e}")
    import traceback
    traceback.print_exc()
