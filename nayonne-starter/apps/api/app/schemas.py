from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=10, max_length=128)
    role: str = "nayonne"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    role: str
    city: str | None
    avatar_url: str | None


class CreatePostRequest(BaseModel):
    title: str | None = Field(default=None, max_length=180)
    body: str = Field(min_length=1, max_length=8000)
    post_type: str = "news"
    memory_date: date | None = None


class PostResponse(BaseModel):
    id: UUID
    author_id: UUID
    title: str | None
    body: str
    post_type: str
    memory_date: date | None
    created_at: datetime


class MarkReadRequest(BaseModel):
    post_id: UUID
