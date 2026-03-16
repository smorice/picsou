from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Post, PostRead, User
from ..schemas import CreatePostRequest, MarkReadRequest, PostResponse

router = APIRouter(prefix="/feed", tags=["feed"])


@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: CreatePostRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    post = Post(
        author_id=current_user.id,
        title=payload.title,
        body=payload.body,
        post_type=payload.post_type,
        memory_date=payload.memory_date,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return PostResponse.model_validate(post, from_attributes=True)


@router.get("/unread", response_model=list[PostResponse])
def unread_feed(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[PostResponse]:
    seen_post_ids_subq = select(PostRead.post_id).where(PostRead.user_id == current_user.id)
    posts = db.scalars(
        select(Post)
        .where(Post.id.not_in(seen_post_ids_subq))
        .order_by(Post.created_at.desc())
        .limit(50)
    ).all()
    return [PostResponse.model_validate(post, from_attributes=True) for post in posts]


@router.get("/all", response_model=list[PostResponse])
def all_posts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[PostResponse]:
    _ = current_user
    posts = db.scalars(select(Post).order_by(Post.created_at.desc()).limit(100)).all()
    return [PostResponse.model_validate(post, from_attributes=True) for post in posts]


@router.post("/mark-read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    payload: MarkReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    post = db.scalar(select(Post).where(Post.id == payload.post_id))
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    already = db.scalar(
        select(PostRead).where(PostRead.user_id == current_user.id, PostRead.post_id == payload.post_id)
    )
    if already is None:
        db.add(PostRead(user_id=current_user.id, post_id=payload.post_id))
        db.commit()
