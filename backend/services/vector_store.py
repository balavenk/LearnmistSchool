import os
import json
import shutil
from typing import List, Dict, Any, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

# Configuration
VECTOR_DB_PATH = "vector_db"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class VectorStoreService:
    def __init__(self):
        self.embeddings = None
        self.db = None
        self._initialize_embeddings()

    def _initialize_embeddings(self):
        """Initialize embeddings only if API key is present."""
        if not OPENAI_API_KEY:
            print("⚠️ OPENAI_API_KEY not found. Vector Store Service is dormant.")
            return

        try:
            self.embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
            if os.path.exists(VECTOR_DB_PATH):
                print("Loading existing vector database...")
                self.db = FAISS.load_local(VECTOR_DB_PATH, self.embeddings, allow_dangerous_deserialization=True)
            else:
                print("No existing vector database found. Ready to create new one.")
        except Exception as e:
            print(f"❌ Failed to initialize Vector Store: {e}")

    def process_file(self, file_path: str, metadata: Dict[str, Any]):
        """
        Process a single file: Load -> Split -> Embed -> Add to DB
        """
        if not self.embeddings:
            raise ValueError("OpenAI API Key is missing. Cannot process file.")

        print(f"Processing PDF for Vector DB: {file_path}")
        
        # 1. Load PDF
        loader = PyPDFLoader(file_path)
        documents = loader.load()

        # 2. Add Metadata
        # Ensure all metadata values are strings for FAISS compatibility
        clean_metadata = {k: str(v) for k, v in metadata.items()}
        for doc in documents:
            doc.metadata.update(clean_metadata)
            doc.metadata["source"] = file_path # Overwrite source to be sure

        # 3. Split Text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=512,
            chunk_overlap=50
        )
        chunks = text_splitter.split_documents(documents)
        print(f"Created {len(chunks)} chunks from {file_path}")

        # 4. Add to Vector DB
        if self.db is None:
            self.db = FAISS.from_documents(chunks, self.embeddings)
        else:
            self.db.add_documents(chunks)

        # 5. Save Local
        self.db.save_local(VECTOR_DB_PATH)
        print(f"Vector DB saved to {VECTOR_DB_PATH}")
        return len(chunks)

    def search(self, query: str, filters: Optional[Dict[str, str]] = None, k: int = 5):
        """
        Search the vector database
        """
        if not self.db:
             raise ValueError("Vector Database is not initialized or empty.")
        
        search_kwargs = {"k": k}
        if filters:
            # Basic pre-filtering if supported by the store wrapper or implement manual
            # FAISS basic support for metadata filtering is limited in LangChain wrapper
            # We pass it to retriever if possible, or use filter argument
            search_kwargs["filter"] = filters

        retriever = self.db.as_retriever(search_kwargs=search_kwargs)
        docs = retriever.invoke(query)
        return docs

    def reset_database(self):
        """
        Hard reset: Clear in-memory DB and delete local folder.
        """
        self.db = None
        if os.path.exists(VECTOR_DB_PATH):
            try:
                shutil.rmtree(VECTOR_DB_PATH)
                print(f"♻ Vector DB at {VECTOR_DB_PATH} has been deleted.")
            except Exception as e:
                print(f"Error deleting vector db: {e}")
                raise e
        
        # Re-initialize empty
        # We don't create a new one until a file is processed, or we can just leave it None
        print("Vector DB reset complete.")
        return True

# Singleton instance
vector_store = VectorStoreService()
