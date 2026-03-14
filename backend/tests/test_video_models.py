import pytest
from sqlalchemy import select

from app.models.user import User
from app.models.video import Video
from app.models.video_analysis import VideoAnalysis
from app.models.video_frame import VideoFrame


@pytest.mark.asyncio
async def test_create_video_with_analysis(setup_db):
    from tests.conftest import TestSession

    async with TestSession() as db:
        user = User(username="videotest", email="v@t.com", hashed_password="x", display_name="V")
        db.add(user)
        await db.flush()

        video = Video(
            title="Test Video",
            filename="test.mp4",
            file_path="/tmp/test.mp4",
            file_size=1024000,
            user_id=user.id,
        )
        db.add(video)
        await db.flush()

        analysis = VideoAnalysis(
            video_id=video.id,
            teaching_style="gentle flow",
            rhythm="moderate",
            guidance_method="verbal cues",
            core_philosophy="mindful movement",
            high_freq_words=["breathe", "relax"],
            raw_result={"test": True},
        )
        db.add(analysis)

        frame = VideoFrame(
            video_id=video.id,
            frame_path="/tmp/frame1.jpg",
            timestamp="02:30",
            frame_type="quality",
            pose_name="warrior",
            description="Warrior pose",
            confidence=0.95,
        )
        db.add(frame)
        await db.commit()

        result = await db.execute(select(Video).where(Video.id == video.id))
        fetched = result.scalar_one()
        assert fetched.title == "Test Video"
        assert fetched.analysis is not None
        assert fetched.analysis.teaching_style == "gentle flow"
        assert len(fetched.frames) == 1
        assert fetched.frames[0].pose_name == "warrior"


@pytest.mark.asyncio
async def test_video_cascade_delete(setup_db):
    from tests.conftest import TestSession

    async with TestSession() as db:
        user = User(username="videodeltest", email="vd@t.com", hashed_password="x", display_name="VD")
        db.add(user)
        await db.flush()

        video = Video(
            title="Delete Me",
            filename="del.mp4",
            file_path="/tmp/del.mp4",
            file_size=512,
            user_id=user.id,
        )
        db.add(video)
        await db.flush()

        analysis = VideoAnalysis(video_id=video.id, teaching_style="test")
        db.add(analysis)

        frame = VideoFrame(video_id=video.id, frame_path="/tmp/f.jpg", timestamp="00:01", frame_type="teaching")
        db.add(frame)
        await db.commit()

        await db.delete(video)
        await db.commit()

        result = await db.execute(select(VideoAnalysis).where(VideoAnalysis.video_id == video.id))
        assert result.scalars().all() == []

        result = await db.execute(select(VideoFrame).where(VideoFrame.video_id == video.id))
        assert result.scalars().all() == []
