from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from datetime import datetime
import mimetypes
import json
import asyncio

from .. import database, models, schemas, auth

router = APIRouter(
    prefix="/upload",
    tags=["upload"],
    responses={404: {"description": "Not found"}},
)

# Constants
STORAGE_ROOT = "storage"
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORAGE_ROOT_ABS = os.path.join(BACKEND_ROOT, STORAGE_ROOT)

def get_current_school_admin(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in [models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


def get_upload_user(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in [models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN, models.UserRole.TEACHER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


def ensure_teacher_upload_scope(
    db: Session,
    current_user: models.User,
    grade_id: int = None,
    subject_id: int = None,
    artifact: models.FileArtifact = None,
):
    if current_user.role != models.UserRole.TEACHER:
        return

    if artifact is not None:
        if artifact.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Cannot access file from another school")
        grade_id = artifact.grade_id
        subject_id = artifact.subject_id

    if grade_id is None or subject_id is None:
        raise HTTPException(status_code=400, detail="grade_id and subject_id are required for teacher scope validation")

    assignment = db.query(models.TeacherAssignment).filter(
        models.TeacherAssignment.teacher_id == current_user.id,
        models.TeacherAssignment.grade_id == grade_id,
        models.TeacherAssignment.subject_id == subject_id,
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not authorized for selected grade/subject")

@router.post("/training-material", response_model=schemas.FileArtifactOut)
async def upload_training_material(
    file: UploadFile = File(...),
    school_id: int = Form(...),
    grade_id: int = Form(...),
    subject_id: int = Form(...),
    description: str = Form(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_upload_user)
):
    # Basic Validation
    if current_user.role != models.UserRole.SUPER_ADMIN and current_user.school_id != school_id:
        raise HTTPException(status_code=403, detail="Cannot upload for another school")

    ensure_teacher_upload_scope(db, current_user, grade_id=grade_id, subject_id=subject_id)

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Directory Structure: storage/{school_id}/{grade_id}/{subject_id}/
    relative_dir = os.path.join(str(school_id), str(grade_id), str(subject_id))
    abs_dir = os.path.join(STORAGE_ROOT_ABS, relative_dir)
    os.makedirs(abs_dir, exist_ok=True)

    # Generate Stored Filename
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    original_filename = file.filename
    clean_filename = "".join(x for x in original_filename if x.isalnum() or x in "._- ")
    stored_filename = f"{timestamp}_{clean_filename}"
    
    file_path = os.path.join(abs_dir, stored_filename)
    relative_path = os.path.join(relative_dir, stored_filename)

    # Save File
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size = os.path.getsize(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # Create DB Record
    new_artifact = models.FileArtifact(
        school_id=school_id,
        grade_id=grade_id,
        subject_id=subject_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        relative_path=relative_path,
        mime_type=file.content_type or mimetypes.guess_type(file.filename)[0],
        file_extension=os.path.splitext(original_filename)[1].lower().replace(".", ""),
        file_size=file_size,
        uploaded_by_id=current_user.id,
        uploaded_at=datetime.utcnow(),
        description=description
    )
    
    db.add(new_artifact)
    db.commit()
    db.refresh(new_artifact)
    
    return new_artifact

@router.get("/training-material/{grade_id}", response_model=schemas.PaginatedResponse[schemas.FileArtifactOut])
def list_training_materials(
    grade_id: int,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_upload_user)
):
    # Validate pagination parameters
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 10

    if current_user.role == models.UserRole.TEACHER:
        grade_assignments = db.query(models.TeacherAssignment).filter(
            models.TeacherAssignment.teacher_id == current_user.id,
            models.TeacherAssignment.grade_id == grade_id
        ).first()
        if not grade_assignments:
            raise HTTPException(status_code=403, detail="Not authorized for selected grade")
    
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Get total count (optimized - only count, no data fetch)
    total_count = db.query(models.FileArtifact).filter(
        models.FileArtifact.grade_id == grade_id,
        models.FileArtifact.school_id == current_user.school_id
    ).count()
    
    # Calculate total pages
    total_pages = (total_count + page_size - 1) // page_size
    
    # Fetch paginated results with join
    results = db.query(models.FileArtifact, models.Subject.name).join(
        models.Subject, models.FileArtifact.subject_id == models.Subject.id
    ).filter(
        models.FileArtifact.grade_id == grade_id,
        models.FileArtifact.school_id == current_user.school_id
    ).order_by(models.FileArtifact.uploaded_at.desc()).offset(offset).limit(page_size).all()
    
    # Map results to schema
    output = []
    for artifact, subject_name in results:
        # Create a dictionary from the artifact ORM object
        artifact_dict = {c.name: getattr(artifact, c.name) for c in artifact.__table__.columns}
        # Add the subject_name
        artifact_dict['subject_name'] = subject_name
        output.append(schemas.FileArtifactOut(**artifact_dict))
    
    return schemas.PaginatedResponse(
        items=output,
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/all-training-materials", response_model=List[schemas.FileArtifactOut])
def get_all_training_materials(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Join with School, Grade, Subject
    results = db.query(
        models.FileArtifact, 
        models.School.name.label("school_name"),
        models.Grade.name.label("grade_name"),
        models.Subject.name.label("subject_name")
    ).join(
        models.School, models.FileArtifact.school_id == models.School.id, isouter=True
    ).join(
        models.Grade, models.FileArtifact.grade_id == models.Grade.id, isouter=True
    ).join(
        models.Subject, models.FileArtifact.subject_id == models.Subject.id, isouter=True
    ).order_by(models.FileArtifact.uploaded_at.desc()).all()
    
    output = []
    for artifact, school_name, grade_name, subject_name in results:
        artifact_dict = {c.name: getattr(artifact, c.name) for c in artifact.__table__.columns}
        artifact_dict['school_name'] = school_name
        artifact_dict['grade_name'] = grade_name
        artifact_dict['subject_name'] = subject_name
        output.append(schemas.FileArtifactOut(**artifact_dict))
        
    return output

@router.put("/training-material/{file_id}/status", response_model=schemas.FileArtifactOut)
def update_file_status(
    file_id: int,
    status_update: schemas.FileArtifactUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in [models.UserRole.SUPER_ADMIN, models.UserRole.SCHOOL_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    artifact = db.query(models.FileArtifact).filter(models.FileArtifact.id == file_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Optional: Check ownership if school admin ? 
    # For now, Super Admin can update any, School Admin can update theirs.
    if current_user.role == models.UserRole.SCHOOL_ADMIN and artifact.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot update file from another school")

    artifact.file_status = status_update.file_status
    db.commit()
    db.refresh(artifact)
    
    # We return the basic artifact, if we needed the joined fields we'd need to query again or construct it.
    # For the response model FileArtifactOut, it expects base fields. 
    # The joined fields (school_name etc) are Optional, so it's fine to return the ORM object directly
    # and they will be null in the response, which is acceptable for a specific update operation.
    return artifact

@router.get("/training-material/id/{file_id}", response_model=schemas.FileArtifactOut)
def get_training_material_details(
    file_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = db.query(
        models.FileArtifact, 
        models.School.name.label("school_name"),
        models.Grade.name.label("grade_name"),
        models.Subject.name.label("subject_name")
    ).join(
        models.School, models.FileArtifact.school_id == models.School.id, isouter=True
    ).join(
        models.Grade, models.FileArtifact.grade_id == models.Grade.id, isouter=True
    ).join(
        models.Subject, models.FileArtifact.subject_id == models.Subject.id, isouter=True
    ).filter(models.FileArtifact.id == file_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="File not found")
        
    artifact, school_name, grade_name, subject_name = result
    artifact_dict = {c.name: getattr(artifact, c.name) for c in artifact.__table__.columns}
    artifact_dict['school_name'] = school_name
    artifact_dict['grade_name'] = grade_name
    artifact_dict['subject_name'] = subject_name
    
    return schemas.FileArtifactOut(**artifact_dict)

from app.services import pdf_service, rag_service
# os is already imported

@router.post("/training-material/{file_id}/train", response_model=schemas.FileArtifactOut)
def train_file(
    file_id: int,
    status_update: schemas.FileArtifactUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_upload_user)
):
    artifact = db.query(models.FileArtifact).filter(models.FileArtifact.id == file_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="File not found")

    if current_user.role != models.UserRole.SUPER_ADMIN and artifact.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot train file from another school")

    ensure_teacher_upload_scope(db, current_user, artifact=artifact)

    # 1. Update DB Status - Just save metadata and mark as Processing
    artifact.file_status = status_update.file_status # Expecting 'Processing' or 'Trained', but usually 'Processing' before WS starts
    if status_update.file_metadata:
        artifact.file_metadata = status_update.file_metadata
    
    db.commit()
    db.refresh(artifact)
    
    # 2. RAG Pipeline is NOT triggered here anymore. It will be triggered by WS connection.
    
    return artifact

@router.websocket("/ws/train/{file_id}")
async def websocket_train_file(websocket: WebSocket, file_id: int, db: Session = Depends(database.get_db)):
    await websocket.accept()
    
    try:
        # Fetch file details
        artifact = db.query(models.FileArtifact).filter(models.FileArtifact.id == file_id).first()
        if not artifact:
            await websocket.send_text("Error: File not found")
            await websocket.close()
            return
            
        await websocket.send_text(f"Starting training process for: {artifact.original_filename}")
        
        # Resolve Path
        file_path = os.path.join(STORAGE_ROOT_ABS, artifact.relative_path)
        
        if not os.path.exists(file_path):
            await websocket.send_text(f"Error: File not found on disk at {file_path}")
            await websocket.close()
            return

        # Prepare Metadata
        user_metadata = {}
        if artifact.file_metadata:
            try:
                user_metadata = json.loads(artifact.file_metadata)
            except:
                pass

        rag_metadata = {
            "file_id": artifact.id,
            "school_id": artifact.school_id,
            "grade_id": artifact.grade_id,
            "subject_id": artifact.subject_id,
            "filename": artifact.original_filename,
            **user_metadata 
        }

        # Step 1: Parse PDF
        await websocket.send_text("Step 1: Parsing PDF...")
        # Note: pdf_service is sync, run in threadpool to avoid blocking event loop
        # But for simplicity in this demo, calling it directly (it's fast enough or blocks briefly)
        # Better: chunks = await asyncio.to_thread(pdf_service.parse_pdf, file_path)
        chunks = pdf_service.parse_pdf(file_path) 
        await websocket.send_text(f"Parsed {len(chunks)} chunks from PDF.")
        
        # Step 2: RAG Pipeline (Async)
        await websocket.send_text("Step 2: Starting Classification and Embedding Pipeline...")
        
        # Define callback to send messages to WS
        async def ws_callback(msg: str):
            await websocket.send_text(msg)
            
        await rag_service.process_chunks_async(chunks, rag_metadata, progress_callback=ws_callback)
        
        # Step 3: Update Status to Trained
        # Re-fetch artifact to ensure session is valid or use merge
        # artifact.file_status = "Trained"
        # db.commit()
        # Updating via new query to avoid session detach issues in long async
        db.query(models.FileArtifact).filter(models.FileArtifact.id == file_id).update({"file_status": "Trained"})
        db.commit()
        
        await websocket.send_text("DONE")
        
    except WebSocketDisconnect:
        print(f"Client disconnected for file {file_id}")
    except Exception as e:
        await websocket.send_text(f"Error: {str(e)}")
        print(f"Error in WS training: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

@router.delete("/training-material/{file_id}")
def delete_training_material(
    file_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in [models.UserRole.SUPER_ADMIN, models.UserRole.SCHOOL_ADMIN, models.UserRole.TEACHER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    artifact = db.query(models.FileArtifact).filter(models.FileArtifact.id == file_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="File not found")

    # School Admin ownership check
    if current_user.role != models.UserRole.SUPER_ADMIN and artifact.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot delete file from another school")

    ensure_teacher_upload_scope(db, current_user, artifact=artifact)

    # 1. Delete Physical File
    # Construct absolute path using STORAGE_ROOT to match upload logic
    try:
        file_path = os.path.join(STORAGE_ROOT_ABS, artifact.relative_path)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Deleted file: {file_path}")
        else:
            print(f"File not found on disk, skipping delete: {file_path}")
            
    except Exception as e:
        print(f"Error deleting physical file: {e}")
        # We continue to delete the DB record even if file delete fails (or maybe not? standard is usually yes to clean up DB)

    # 2. Delete DB Record
    db.delete(artifact)
    db.commit()

    return {"message": "File deleted successfully"}

@router.get("/training-material/{file_id}/download")
def download_training_material(
    file_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in [models.UserRole.SUPER_ADMIN, models.UserRole.SCHOOL_ADMIN, models.UserRole.TEACHER]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    artifact = db.query(models.FileArtifact).filter(models.FileArtifact.id == file_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="File not found")
        
    if current_user.role != models.UserRole.SUPER_ADMIN and artifact.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot download file from another school")

    ensure_teacher_upload_scope(db, current_user, artifact=artifact)
        
    file_path = os.path.join(STORAGE_ROOT_ABS, artifact.relative_path)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(
        path=file_path, 
        filename=artifact.original_filename,
        media_type=artifact.mime_type or "application/pdf"
    )
