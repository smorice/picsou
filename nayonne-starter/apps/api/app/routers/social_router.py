from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/integrations/social", tags=["social"])


class SocialIngestRequest(BaseModel):
    platform: str = Field(description="instagram|facebook|tiktok|youtube")
    author_name: str = Field(min_length=1, max_length=120)
    text: str = Field(min_length=1, max_length=8000)
    media_urls: list[str] = Field(default_factory=list)
    published_at: str


@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
def ingest_post(
    payload: SocialIngestRequest,
    x_ingest_token: str | None = Header(default=None),
) -> dict:
    # Bootstrap placeholder: store payload in queue/DB in next iteration.
    if x_ingest_token != "replace_me_ingest_token":
        raise HTTPException(status_code=401, detail="Invalid ingest token")

    return {
        "status": "accepted",
        "platform": payload.platform,
        "normalized": {
            "title": f"Publication importee depuis {payload.platform}",
            "body": payload.text,
            "media_count": len(payload.media_urls),
        },
    }
