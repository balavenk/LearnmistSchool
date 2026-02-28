import fitz  # PyMuPDF
from typing import List

def parse_pdf(file_path: str, chunk_size: int = 1000) -> List[str]:
    """
    Parses a PDF file and splits text into chunks.
    
    Args:
        file_path: Absolute path to the PDF file.
        chunk_size: Approximate size of each chunk in characters (roughly correlates to tokens).
        
    Returns:
        List of text chunks.
    """
    try:
        doc = fitz.open(file_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        
        # Simple chunking by character count for now. 
        # For production, use better tokenizer-aware splitters (e.g. TikToken or LangChain's splitters)
        chunks = []
        for i in range(0, len(full_text), chunk_size):
            chunks.append(full_text[i:i + chunk_size])
            
        return chunks
    except Exception as e:
        print(f"Error parsing PDF {file_path}: {e}")
        raise e
