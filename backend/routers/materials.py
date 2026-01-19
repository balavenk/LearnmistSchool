from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import json
from datetime import datetime
import models, schemas, database
from auth import get_current_active_user

router = APIRouter(
    prefix="/materials",
    tags=["materials"]
)

# Directory to store uploaded files
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload", response_model=schemas.MaterialResponse)
async def upload_material(
    file: UploadFile = File(...),
    subject: str = Form(...), # Required subject
    extra_tags: Optional[str] = Form(None), # Optional extra tags
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Create metadata/tags JSON
    tags_dict = {"subject": subject}
    if extra_tags:
        try:
             extra = json.loads(extra_tags)
             if isinstance(extra, dict):
                 tags_dict.update(extra)
        except:
             pass
    
    tags_json = json.dumps(tags_dict)
    
    # --- Folder Organization Logic ---
    def safe_path(s):
        # Allow dots for file extensions, but be careful with directory traversal
        return "".join(c for c in str(s) if c.isalnum() or c in (' ', '_', '-', '.')).strip()

    # Normalize Keys
    # Helper to get value case-insensitively
    def get_tag(d, keys):
        for k in keys:
            if k in d: return d[k]
            # simple case insensitive check
            for dk in d.keys():
                if dk.lower() == k.lower(): return d[dk]
        return None

    class_num = get_tag(tags_dict, ["Class Number", "Standard", "Grade", "Class"]) or "Uncategorized"
    # subject is already captured from form, but check tags just in case override
    subj_folder = safe_path(subject)
    
    # Category (Book or Chapter)
    category_name = "Misc"
    if "Chapters" in tags_dict or "chapters" in tags_dict:
        category_name = get_tag(tags_dict, ["Book", "Book Name"]) or "Miscellaneous_Books"
    else:
        # Prioritize explicit 'Category' tag from frontend
        category_name = get_tag(tags_dict, ["Category", "category", "Chapter Name", "Chapter"]) or "Misc"
        
    # data/{Class}/{Subject}/{Book_or_Chapter}/filename.pdf
    # We use "uploads" as base instead of user's "data" to match our config
    target_dir = os.path.join(UPLOAD_DIR, safe_path(class_num), subj_folder, safe_path(category_name))
    os.makedirs(target_dir, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    clean_filename = safe_path(file.filename.replace(" ", "_"))
    # We keep the timestamp prefix to avoid collisions even inside folders
    stored_filename = f"{timestamp}_{clean_filename}"
    file_path = os.path.join(target_dir, stored_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
        
    # Determine file type (extension)
    file_ext = os.path.splitext(clean_filename)[1].replace(".", "") or "unknown"

    # Create DB record
    new_material = models.FileArtifact(
        filename=file.filename, # Display name
        file_path=file_path,
        file_type=file_ext,
        tags=tags_json,
        uploaded_by_id=current_user.id
    )
    
    db.add(new_material)
    db.commit()
    db.refresh(new_material)
    
    return new_material

@router.get("/", response_model=List[schemas.MaterialResponse])
def get_materials(
    subject: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    query = db.query(models.FileArtifact)
    
    # Filter by user role/permissions if needed. 
    # For now, let's assume all authenticated users can see all materials 
    # (or maybe we filter by school? The model doesn't link artifact directly to school, 
    # but the uploader has a school. We can join User to filter by school.)
    
    if current_user.role != models.UserRole.SUPER_ADMIN:
        # Filter by school of the uploader
        if current_user.school_id:
             query = query.join(models.User).filter(models.User.school_id == current_user.school_id)
    
    # Basic Subject Filter (naive string check in JSON)
    # Ideally use native JSON operators in PG but text search works for simple JSON strings
    if subject:
        # search for "subject": "Math" in the tags text
        # This is a bit brittle but works for MVP without complex PG dialects imports
        search_pattern = f'%"subject": "{subject}"%' 
        query = query.filter(models.FileArtifact.tags.like(search_pattern))

    return query.all()

# --- Vector DB Training Endpoint ---
from services.vector_store import vector_store

@router.post("/train/{material_id}")
def train_material(
    material_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can train models")
        
    material = db.query(models.FileArtifact).filter(models.FileArtifact.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
        
    # Deserialize tags
    try:
        metadata = json.loads(material.tags)
    except:
        metadata = {}
    
    # Add extra metadata
    metadata["material_id"] = material.id
    metadata["filename"] = material.filename
    
    try:
        num_chunks = vector_store.process_file(material.file_path, metadata)
        return {
            "message": "Has been trained successfully", 
            "chunks_processed": num_chunks,
            "metadata_used": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@router.delete("/vector-db/reset")
def reset_vector_db(
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can reset the database")
    
    try:
        vector_store.reset_database()
        return {"message": "Vector database has been successfully reset. All trained knowledge is removed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{material_id}")
def delete_material(
    material_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can delete materials")
        
    material = db.query(models.FileArtifact).filter(models.FileArtifact.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
        
    # Delete file from disk
    if os.path.exists(material.file_path):
        try:
            os.remove(material.file_path)
        except Exception as e:
            print(f"Error removing file {material.file_path}: {e}")
            # we continue to delete from DB even if file delete fails (orphaned file better than broken app state)
            
    db.delete(material)
    db.commit()
    
    return {"message": f"Material '{material.filename}' has been deleted."}
