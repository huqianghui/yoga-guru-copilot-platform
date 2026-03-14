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


class VideoDetailResponse(VideoResponse):
    analysis: AnalysisResponse | None = None
    frames: list[FrameResponse] = []


class GenerateCaptionRequest(BaseModel):
    frame_descriptions: list[str]
    style: str = "轻松愉悦"  # 轻松愉悦 | 专业引导 | 鼓励感恩
