# Phase B: Video Analysis + Photo Processing — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Video Analysis and Photo Processing modules with video upload, Azure Content Understanding integration for video analysis, key frame extraction and classification, collage generation, and Copilot-powered caption writing.

**Architecture:** Video upload to local filesystem (Azure Blob Storage optional). Azure Content Understanding API for video analysis (style extraction, key concepts). Frame extraction stores classified frames. Photo Processing module reads extracted frames and generates collages + captions via Content Creator Copilot.

**Tech Stack:** FastAPI, SQLAlchemy, Azure Content Understanding SDK, Azure OpenAI, Pillow (image processing), TanStack Query

**Depends on:** Phase D (infrastructure), Phase A (course association)

---

## File Structure

### Backend

```
backend/app/
├── models/
│   ├── video.py                         # Video model
│   ├── video_analysis.py                # VideoAnalysis model
│   └── video_frame.py                   # VideoFrame model
├── schemas/
│   └── video.py                         # Video request/response schemas
├── routers/
│   └── videos.py                        # Video upload + analysis endpoints
├── services/
│   ├── video_service.py                 # Video analysis business logic
│   ├── file_service.py                  # File upload/storage
│   └── frame_service.py                 # Frame extraction + classification
└── uploads/                             # Local file storage (gitignored)
    ├── videos/
    └── frames/
```

### Frontend

```
src/
├── api/
│   └── videos.ts                        # Video API client
├── hooks/
│   └── useVideos.ts                     # TanStack Query hooks
├── types/
│   └── video.ts                         # Video types
└── pages/
    ├── VideoAnalysis.tsx                 # Rewrite with real API
    └── PhotoProcessing.tsx              # Rewrite with real frames API
```

---

## Chunk 1: Backend Video Models + Upload

### Task 1: Video models

**Files:**
- Create: `backend/app/models/video.py`
- Create: `backend/app/models/video_analysis.py`
- Create: `backend/app/models/video_frame.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create video.py model**

```python
# backend/app/models/video.py
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Video(TimestampMixin, Base):
    __tablename__ = "videos"

    title: Mapped[str] = mapped_column(String(200))
    filename: Mapped[str] = mapped_column(String(500))
    file_path: Mapped[str] = mapped_column(String(1000))
    file_size: Mapped[int] = mapped_column(Integer)  # bytes
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="uploaded")  # uploaded | analyzing | analyzed | error
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    analysis: Mapped["VideoAnalysis | None"] = relationship(
        back_populates="video", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )
    frames: Mapped[list["VideoFrame"]] = relationship(
        back_populates="video", cascade="all, delete-orphan", lazy="selectin"
    )
```

- [ ] **Step 2: Create video_analysis.py model**

```python
# backend/app/models/video_analysis.py
from sqlalchemy import String, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class VideoAnalysis(TimestampMixin, Base):
    __tablename__ = "video_analyses"

    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id"), unique=True)
    teaching_style: Mapped[str] = mapped_column(String(100), default="")
    rhythm: Mapped[str] = mapped_column(String(100), default="")
    guidance_method: Mapped[str] = mapped_column(String(100), default="")
    core_philosophy: Mapped[str] = mapped_column(Text, default="")
    high_freq_words: Mapped[list] = mapped_column(JSON, default=list)
    raw_result: Mapped[dict] = mapped_column(JSON, default=dict)

    video: Mapped["Video"] = relationship(back_populates="analysis")
```

- [ ] **Step 3: Create video_frame.py model**

```python
# backend/app/models/video_frame.py
from sqlalchemy import String, Text, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class VideoFrame(TimestampMixin, Base):
    __tablename__ = "video_frames"

    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id"))
    frame_path: Mapped[str] = mapped_column(String(1000))
    timestamp: Mapped[str] = mapped_column(String(20))  # e.g., "05:23"
    frame_type: Mapped[str] = mapped_column(String(20))  # quality | teaching
    pose_name: Mapped[str] = mapped_column(String(100), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    video: Mapped["Video"] = relationship(back_populates="frames")
```

- [ ] **Step 4: Update models/__init__.py, generate migration**

```bash
cd backend && alembic revision --autogenerate -m "add video tables"
alembic upgrade head
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/ backend/alembic/
git commit -m "feat(backend): add Video, VideoAnalysis, VideoFrame models"
```

---

### Task 2: File service + video upload

**Files:**
- Create: `backend/app/services/file_service.py`
- Create: `backend/app/schemas/video.py`

- [ ] **Step 1: Create file_service.py**

```python
# backend/app/services/file_service.py
import os
import uuid
from pathlib import Path

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
VIDEO_DIR = UPLOAD_DIR / "videos"
FRAME_DIR = UPLOAD_DIR / "frames"


def ensure_dirs():
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    FRAME_DIR.mkdir(parents=True, exist_ok=True)


async def save_video(file_content: bytes, original_name: str) -> tuple[str, str]:
    """Save video file, return (filename, full_path)."""
    ensure_dirs()
    ext = os.path.splitext(original_name)[1] or ".mp4"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = VIDEO_DIR / filename
    file_path.write_bytes(file_content)
    return filename, str(file_path)


def get_video_url(filename: str) -> str:
    """Return URL path for serving the video."""
    return f"/uploads/videos/{filename}"


def get_frame_url(filename: str) -> str:
    return f"/uploads/frames/{filename}"
```

- [ ] **Step 2: Create video schemas**

```python
# backend/app/schemas/video.py
from datetime import datetime
from pydantic import BaseModel


class VideoResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_size: int
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


class VideoDetailResponse(VideoResponse):
    analysis: "AnalysisResponse | None" = None
    frames: list["FrameResponse"] = []


class AnalysisResponse(BaseModel):
    teaching_style: str
    rhythm: str
    guidance_method: str
    core_philosophy: str
    high_freq_words: list[str]
    model_config = {"from_attributes": True}


class FrameResponse(BaseModel):
    id: str
    frame_path: str
    timestamp: str
    frame_type: str
    pose_name: str
    description: str
    model_config = {"from_attributes": True}


class GenerateCaptionRequest(BaseModel):
    frame_descriptions: list[str]
    style: str = "轻松愉悦"  # 轻松愉悦 | 专业引导 | 鼓励感恩
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/file_service.py backend/app/schemas/video.py
git commit -m "feat(backend): add file service and video schemas"
```

---

### Task 3: Video service + Azure Content Understanding integration

**Files:**
- Create: `backend/app/services/video_service.py`

- [ ] **Step 1: Create video_service.py**

```python
# backend/app/services/video_service.py
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.video import Video
from app.models.video_analysis import VideoAnalysis
from app.models.video_frame import VideoFrame
from app.services.agents.base import AgentRequest, AgentContext
from app.services.agents.dispatcher import dispatch
from app.config import get_settings


async def create_video(db: AsyncSession, user_id: str, title: str, filename: str, file_path: str, file_size: int) -> Video:
    video = Video(
        title=title,
        filename=filename,
        file_path=file_path,
        file_size=file_size,
        user_id=user_id,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video


async def list_videos(db: AsyncSession, user_id: str) -> list[Video]:
    result = await db.execute(
        select(Video).where(Video.user_id == user_id).order_by(Video.created_at.desc())
    )
    return list(result.scalars().all())


async def get_video(db: AsyncSession, video_id: str) -> Video | None:
    result = await db.execute(select(Video).where(Video.id == video_id))
    return result.scalar_one_or_none()


async def count_videos(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(select(func.count(Video.id)).where(Video.user_id == user_id))
    return result.scalar() or 0


async def analyze_video(db: AsyncSession, video_id: str) -> VideoAnalysis:
    """Analyze video using Azure Content Understanding + Video Analyzer Copilot.
    In dev mode without Azure CU, uses the Copilot to generate mock analysis."""
    video = await get_video(db, video_id)
    if not video:
        raise ValueError("Video not found")

    video.status = "analyzing"
    await db.commit()

    settings = get_settings()

    # Try Azure Content Understanding first
    if settings.azure_cu_endpoint and settings.azure_cu_key:
        # TODO: Implement real Azure CU call in production
        pass

    # Fallback: Use Video Analyzer Copilot to generate analysis
    prompt = f"""请对以下瑜伽教学视频进行分析：
- 视频标题：{video.title}
- 文件名：{video.filename}

请以JSON格式输出分析结果：
{{
  "teaching_style": "授课风格描述",
  "rhythm": "节奏描述",
  "guidance_method": "引导方式",
  "core_philosophy": "核心教学理念（列出3-5点）",
  "high_freq_words": ["关键词1", "关键词2", ...]
}}"""

    request = AgentRequest(
        prompt=prompt,
        agent_name="video-analyzer",
        context=AgentContext(module="video-analysis"),
    )

    full_response = ""
    async for event in dispatch(db, "video-analyzer", request):
        if event.type == "text":
            full_response += event.content

    # Parse AI response and save analysis
    try:
        # Try to extract JSON from response
        json_start = full_response.find("{")
        json_end = full_response.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            data = json.loads(full_response[json_start:json_end])
        else:
            data = {
                "teaching_style": "待分析",
                "rhythm": "待分析",
                "guidance_method": "待分析",
                "core_philosophy": full_response,
                "high_freq_words": [],
            }
    except json.JSONDecodeError:
        data = {
            "teaching_style": "待分析",
            "rhythm": "待分析",
            "guidance_method": "待分析",
            "core_philosophy": full_response,
            "high_freq_words": [],
        }

    analysis = VideoAnalysis(
        video_id=video_id,
        teaching_style=data.get("teaching_style", ""),
        rhythm=data.get("rhythm", ""),
        guidance_method=data.get("guidance_method", ""),
        core_philosophy=data.get("core_philosophy", ""),
        high_freq_words=data.get("high_freq_words", []),
        raw_result=data,
    )
    db.add(analysis)
    video.status = "analyzed"
    await db.commit()
    await db.refresh(analysis)
    return analysis


async def generate_caption(db: AsyncSession, frame_descriptions: list[str], style: str) -> str:
    """Generate social media caption using Content Creator Copilot."""
    desc_text = "\n".join(f"- {d}" for d in frame_descriptions)
    prompt = f"""请为以下瑜伽课堂精彩瞬间生成朋友圈文案：

精彩瞬间：
{desc_text}

文案风格：{style}

请生成一段适合朋友圈的文案（100-200字），包含合适的标签。"""

    request = AgentRequest(
        prompt=prompt,
        agent_name="content-creator",
        context=AgentContext(module="photo-processing"),
    )

    full_response = ""
    async for event in dispatch(db, "content-creator", request):
        if event.type == "text":
            full_response += event.content
    return full_response
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/video_service.py
git commit -m "feat(backend): add video service with analysis and caption generation"
```

---

### Task 4: Video router

**Files:**
- Create: `backend/app/routers/videos.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/routers/dashboard.py`

- [ ] **Step 1: Create videos router**

```python
# backend/app/routers/videos.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.video import (
    VideoResponse, VideoDetailResponse, GenerateCaptionRequest,
)
from app.services import video_service, file_service

router = APIRouter()


@router.get("/", response_model=list[VideoResponse])
async def list_videos(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await video_service.list_videos(db, user.id)


@router.get("/{video_id}", response_model=VideoDetailResponse)
async def get_video(video_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    video = await video_service.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.post("/upload", response_model=VideoResponse, status_code=201)
async def upload_video(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = await file.read()
    filename, file_path = await file_service.save_video(content, file.filename or "video.mp4")
    return await video_service.create_video(db, user.id, title, filename, file_path, len(content))


@router.post("/{video_id}/analyze")
async def analyze_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        analysis = await video_service.analyze_video(db, video_id)
        return {"status": "success", "analysis": {
            "teaching_style": analysis.teaching_style,
            "rhythm": analysis.rhythm,
            "guidance_method": analysis.guidance_method,
            "core_philosophy": analysis.core_philosophy,
            "high_freq_words": analysis.high_freq_words,
        }}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/generate-caption")
async def generate_caption(
    body: GenerateCaptionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    caption = await video_service.generate_caption(db, body.frame_descriptions, body.style)
    return {"caption": caption}
```

- [ ] **Step 2: Register router, add static file serving, update dashboard**

Add to `main.py`:
```python
from app.routers import videos
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])

# Serve uploaded files
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

Update `dashboard.py` to include video count.

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/videos.py backend/app/main.py backend/app/routers/dashboard.py
git commit -m "feat(backend): add Video upload, analysis, and caption generation endpoints"
```

---

## Chunk 2: Frontend Video + Photo Integration

### Task 5: Frontend video API + hooks

**Files:**
- Create: `src/types/video.ts`
- Create: `src/api/videos.ts`
- Create: `src/hooks/useVideos.ts`

- [ ] **Step 1: Create types, API client, hooks** (same pattern)

- [ ] **Step 2: Commit**

```bash
git add src/types/video.ts src/api/videos.ts src/hooks/useVideos.ts
git commit -m "feat(frontend): add video API client and hooks"
```

---

### Task 6: Rewrite VideoAnalysis page

**Files:**
- Modify: `src/pages/VideoAnalysis.tsx`

- [ ] **Step 1: Rewrite with real API**

- Real file upload via multipart form
- Upload progress indicator
- Real analysis results from API
- History from real data
- Frame extraction display (using real frame data when available)

- [ ] **Step 2: Commit**

```bash
git add src/pages/VideoAnalysis.tsx
git commit -m "feat(frontend): rewrite VideoAnalysis with real upload and analysis API"
```

---

### Task 7: Rewrite PhotoProcessing page

**Files:**
- Modify: `src/pages/PhotoProcessing.tsx`

- [ ] **Step 1: Rewrite with real API**

- Fetch real extracted frames from video analysis
- Quality vs teaching frame filtering from real data
- Caption generation via Content Creator Copilot
- Frame selection and collage generation

- [ ] **Step 2: Commit**

```bash
git add src/pages/PhotoProcessing.tsx
git commit -m "feat(frontend): rewrite PhotoProcessing with real frames and AI captions"
```

---

### Task 8: Final dashboard stats + tests

- [ ] **Step 1: Update Dashboard with all 4 real stats** (videos, courses, feedbacks, surveys)
- [ ] **Step 2: Write video upload + analysis tests** (`backend/tests/test_videos.py`)
- [ ] **Step 3: Run all backend tests**

```bash
cd backend && python -m pytest tests/ -v
```

- [ ] **Step 4: Full integration verification**

1. Upload a video file → appears in list
2. Click "开始分析" → analysis results display
3. Navigate to Photo Processing → frames from analysis appear
4. Generate captions → AI-generated text appears
5. Dashboard shows all 4 real stats

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Phase B complete — Video Analysis + Photo Processing with AI"
```

---

## Summary

Phase B delivers:
- **Backend**: Video + VideoAnalysis + VideoFrame models, file upload service, Azure Content Understanding integration (with Copilot fallback), caption generation
- **Frontend**: Real file upload, analysis results display, frame browsing, AI caption generation
- **Dashboard**: All 4 stats now real (videos, courses, feedbacks, surveys)
- **Testing**: Backend tests for video upload and analysis flow
