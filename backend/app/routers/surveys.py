from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.survey import (
    CreateSurveyRequest,
    SurveyDetailResponse,
    SubmitResponseRequest,
    GenerateQuestionsRequest,
    GenerateReplyRequest,
)
from app.services import survey_service

router = APIRouter()


@router.get("/", response_model=list[SurveyDetailResponse])
async def list_surveys(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await survey_service.list_surveys(db, user.id)


@router.post("/generate-questions")
async def generate_questions(
    body: GenerateQuestionsRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await survey_service.generate_questions_with_ai(
        db, body.course_title, body.course_style, body.course_theme
    )
    return {"generated_content": result}


@router.post("/generate-reply")
async def generate_reply(
    body: GenerateReplyRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await survey_service.generate_reply_with_ai(db, body.feedback, body.question)
    return {"generated_reply": result}


@router.post("/", response_model=SurveyDetailResponse, status_code=201)
async def create_survey(
    body: CreateSurveyRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await survey_service.create_survey(db, user.id, body)


@router.get("/{survey_id}", response_model=SurveyDetailResponse)
async def get_survey(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    survey = await survey_service.get_survey(db, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey


@router.delete("/{survey_id}", status_code=204)
async def delete_survey(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    deleted = await survey_service.delete_survey(db, survey_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Survey not found")


@router.post("/{survey_id}/responses")
async def submit_response(
    survey_id: str,
    body: SubmitResponseRequest,
    db: AsyncSession = Depends(get_db),
):
    return await survey_service.submit_response(db, survey_id, body)
