from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.video import (
    VideoResponse, VideoDetailResponse, GenerateCaptionRequest,
)
from app.services import video_service
from app.services import file_service

router = APIRouter()


@router.get("/", response_model=list[VideoResponse])
async def list_videos(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    return await video_service.list_videos(db, user.id)


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


@router.post("/generate-caption")
async def generate_caption(
    body: GenerateCaptionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    caption = await video_service.generate_caption(db, body.frame_descriptions, body.style)
    return {"caption": caption}


@router.get("/{video_id}", response_model=VideoDetailResponse)
async def get_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await video_service.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.post("/{video_id}/analyze")
async def analyze_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        analysis = await video_service.analyze_video(db, video_id)
        return {
            "status": "success",
            "analysis": {
                "teaching_style": analysis.teaching_style,
                "rhythm": analysis.rhythm,
                "guidance_method": analysis.guidance_method,
                "core_philosophy": analysis.core_philosophy,
                "high_freq_words": analysis.high_freq_words,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = await video_service.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    await video_service.delete_video(db, video_id)
