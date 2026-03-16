from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..models import User
from ..schemas import UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/pending-users", response_model=list[UserResponse])
def pending_users(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[UserResponse]:
    users = db.scalars(select(User).where(User.is_active.is_(False))).all()
    return [UserResponse.model_validate(user, from_attributes=True) for user in users]


@router.post("/activate/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def activate_user(user_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> None:
    user = db.scalar(select(User).where(User.id == user_id))
    if user:
        user.is_active = True
        db.add(user)
        db.commit()
