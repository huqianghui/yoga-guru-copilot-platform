from datetime import datetime
from pydantic import BaseModel


class QuestionInput(BaseModel):
    text: str
    question_type: str = "text"


class CreateSurveyRequest(BaseModel):
    title: str
    description: str = ""
    course_id: str | None = None
    questions: list[QuestionInput] = []


class SubmitResponseRequest(BaseModel):
    question_id: str
    respondent_name: str = "Anonymous"
    answer: str
    satisfaction: int | None = None


class QuestionResponse(BaseModel):
    id: str
    text: str
    question_type: str
    order_index: int

    model_config = {"from_attributes": True}


class FeedbackResponse(BaseModel):
    id: str
    question_id: str
    respondent_name: str
    answer: str
    satisfaction: int | None

    model_config = {"from_attributes": True}


class SurveyDetailResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    created_at: datetime
    questions: list[QuestionResponse] = []
    responses: list[FeedbackResponse] = []

    model_config = {"from_attributes": True}


class GenerateQuestionsRequest(BaseModel):
    course_title: str
    course_style: str = ""
    course_theme: str = ""


class GenerateReplyRequest(BaseModel):
    feedback: str
    question: str
