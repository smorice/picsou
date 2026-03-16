from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, engine
from .routers.admin_router import router as admin_router
from .routers.auth_router import router as auth_router
from .routers.chat_router import router as chat_router
from .routers.feed_router import router as feed_router
from .routers.social_router import router as social_router

app = FastAPI(title="Les Nayonnes API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory rate limiter for bootstrap. Move to Redis for production hardening.
_rate_limit_state: dict[str, list[float]] = {}


@app.middleware("http")
async def basic_rate_limit(request: Request, call_next):
    from time import time

    ip = request.client.host if request.client else "unknown"
    now = time()
    window_seconds = 60
    max_requests = 120

    stamps = _rate_limit_state.get(ip, [])
    stamps = [stamp for stamp in stamps if now - stamp < window_seconds]
    if len(stamps) >= max_requests:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded"},
        )

    stamps.append(now)
    _rate_limit_state[ip] = stamps
    return await call_next(request)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    with Session(engine) as session:
        session.execute(text("SELECT 1"))
    return {"status": "ok", "env": settings.app_env}


app.include_router(auth_router)
app.include_router(feed_router)
app.include_router(admin_router)
app.include_router(chat_router)
app.include_router(social_router)
