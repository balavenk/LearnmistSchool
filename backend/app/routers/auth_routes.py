from fastapi import APIRouter, Depends
from .. import schemas, models, auth

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)

@router.get("/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user
