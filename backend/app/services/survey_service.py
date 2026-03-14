from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.survey import Survey
from app.models.survey_question import SurveyQuestion
from app.models.survey_response import SurveyResponse as SurveyResponseModel
from app.schemas.survey import CreateSurveyRequest, SubmitResponseRequest
from app.services.agents.base import AgentRequest, AgentContext
from app.services.agents.dispatcher import dispatch


async def create_survey(db: AsyncSession, user_id: str, data: CreateSurveyRequest) -> Survey:
    survey = Survey(
        title=data.title,
        description=data.description,
        course_id=data.course_id,
        user_id=user_id,
    )
    db.add(survey)
    await db.flush()

    for i, q in enumerate(data.questions):
        db.add(SurveyQuestion(
            survey_id=survey.id,
            text=q.text,
            question_type=q.question_type,
            order_index=i,
        ))

    await db.commit()
    await db.refresh(survey)
    return survey


async def list_surveys(db: AsyncSession, user_id: str) -> list[Survey]:
    result = await db.execute(
        select(Survey).where(Survey.user_id == user_id).order_by(Survey.created_at.desc())
    )
    return list(result.scalars().all())


async def get_survey(db: AsyncSession, survey_id: str) -> Survey | None:
    result = await db.execute(select(Survey).where(Survey.id == survey_id))
    return result.scalar_one_or_none()


async def delete_survey(db: AsyncSession, survey_id: str) -> bool:
    survey = await get_survey(db, survey_id)
    if survey:
        await db.delete(survey)
        await db.commit()
        return True
    return False


async def submit_response(
    db: AsyncSession, survey_id: str, data: SubmitResponseRequest
) -> SurveyResponseModel:
    response = SurveyResponseModel(
        survey_id=survey_id,
        question_id=data.question_id,
        respondent_name=data.respondent_name,
        answer=data.answer,
        satisfaction=data.satisfaction,
    )
    db.add(response)
    await db.commit()
    await db.refresh(response)
    return response


async def count_surveys(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(Survey.id)).where(Survey.user_id == user_id)
    )
    return result.scalar() or 0


async def count_responses(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(SurveyResponseModel.id))
        .join(Survey, SurveyResponseModel.survey_id == Survey.id)
        .where(Survey.user_id == user_id)
    )
    return result.scalar() or 0


async def generate_questions_with_ai(
    db: AsyncSession, course_title: str, course_style: str, course_theme: str
) -> str:
    prompt = f"""请为以下课程生成3-5个课后反馈问卷问题：
- 课程名称：{course_title}
- 课程类型：{course_style}
- 课程主题：{course_theme}

请以JSON数组格式输出：
[{{"text": "问题内容", "type": "text|rating"}}]"""

    request = AgentRequest(
        prompt=prompt,
        agent_name="survey-helper",
        context=AgentContext(module="questionnaire"),
    )

    full_response = ""
    async for event in dispatch(db, "survey-helper", request):
        if event.type == "text":
            full_response += event.content
    return full_response


async def generate_reply_with_ai(db: AsyncSession, feedback: str, question: str) -> str:
    prompt = f"""学员对问题"{question}"的反馈是："{feedback}"
请生成一段温暖、专业的个性化回复（50-100字），感谢学员的反馈并给予鼓励。"""

    request = AgentRequest(
        prompt=prompt,
        agent_name="survey-helper",
        context=AgentContext(module="questionnaire"),
    )

    full_response = ""
    async for event in dispatch(db, "survey-helper", request):
        if event.type == "text":
            full_response += event.content
    return full_response
