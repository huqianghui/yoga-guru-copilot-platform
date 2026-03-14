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
