import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.video import Video
from app.models.video_analysis import VideoAnalysis
from app.models.video_frame import VideoFrame
from app.services.agents.base import AgentRequest, AgentContext
from app.services.agents.dispatcher import dispatch
from app.config import get_settings

logger = logging.getLogger(__name__)


async def create_video(
    db: AsyncSession, user_id: str, title: str, filename: str, file_path: str, file_size: int
) -> Video:
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


async def delete_video(db: AsyncSession, video_id: str) -> None:
    video = await get_video(db, video_id)
    if video:
        await db.delete(video)
        await db.commit()


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
        try:
            from app.services.azure_cu_service import analyze_video_with_cu

            video_url = f"https://{settings.app_domain or 'localhost'}/uploads/videos/{video.filename}"
            cu_result = await analyze_video_with_cu(
                settings.azure_cu_endpoint, settings.azure_cu_key, video_url
            )

            analysis = VideoAnalysis(
                video_id=video.id,
                teaching_style=cu_result.get("teaching_style", ""),
                rhythm=cu_result.get("rhythm", ""),
                guidance_method=cu_result.get("guidance_method", ""),
                core_philosophy=cu_result.get("core_philosophy", ""),
                high_freq_words=[],
                raw_result=cu_result.get("raw_result", {}),
            )
            db.add(analysis)

            # Extract key moments as frames
            for moment in cu_result.get("key_moments", []):
                frame = VideoFrame(
                    video_id=video.id,
                    frame_path="",
                    timestamp=moment.get("timestamp", "00:00"),
                    frame_type=moment.get("frame_type", "quality"),
                    pose_name=moment.get("pose_name", ""),
                    description=moment.get("description", ""),
                )
                db.add(frame)

            video.status = "analyzed"
            await db.commit()
            await db.refresh(video)
            return video

        except Exception as e:
            logger.warning(f"Azure CU analysis failed, falling back to agent: {e}")

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
