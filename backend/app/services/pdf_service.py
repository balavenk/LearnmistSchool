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
        
        # Overlapping chunking to prevent splitting questions
        overlap = chunk_size // 10
        chunks = []
        start = 0
        while start < len(full_text):
            end = start + chunk_size
            chunks.append(full_text[start:end])
            if end >= len(full_text):
                break
            start = end - overlap
            
        return chunks
    except Exception as e:
        print(f"Error parsing PDF {file_path}: {e}")
        raise e
