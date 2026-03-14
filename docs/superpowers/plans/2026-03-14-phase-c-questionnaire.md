# Phase C: Questionnaire Management Module — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Questionnaire Management module with full CRUD API, AI-powered question generation via the Survey Helper Copilot, feedback collection, satisfaction analysis, and AI-generated reply suggestions.

**Architecture:** RESTful API for surveys + survey_questions + survey_responses tables. The Survey Helper Copilot generates questions and reply suggestions via Azure OpenAI. Frontend forms submit to the API and display feedback analytics.

**Tech Stack:** FastAPI, SQLAlchemy, TanStack Query, existing shared components

**Depends on:** Phase D (infrastructure), Phase A (course data for questionnaire association)

---

## File Structure

### Backend

```
backend/app/
├── models/
│   ├── survey.py                        # Survey model
│   ├── survey_question.py               # SurveyQuestion model
│   └── survey_response.py               # SurveyResponse model
├── schemas/
│   └── survey.py                        # Survey request/response schemas
├── routers/
│   └── surveys.py                       # Survey CRUD + AI endpoints
└── services/
    └── survey_service.py                # Survey business logic + AI
```

### Frontend

```
src/
├── api/
│   └── surveys.ts                       # Survey API client
├── hooks/
│   └── useSurveys.ts                    # TanStack Query hooks
├── types/
│   └── survey.ts                        # Survey types
└── pages/
    └── QuestionnaireManagement.tsx       # Rewrite with real API
```

---

## Chunk 1: Backend Survey Module

### Task 1: Survey models

**Files:**
- Create: `backend/app/models/survey.py`
- Create: `backend/app/models/survey_question.py`
- Create: `backend/app/models/survey_response.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create survey.py model**

```python
# backend/app/models/survey.py
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Survey(TimestampMixin, Base):
    __tablename__ = "surveys"

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    course_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("courses.id"), nullable=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | active | closed

    questions: Mapped[list["SurveyQuestion"]] = relationship(
        back_populates="survey", cascade="all, delete-orphan",
        lazy="selectin", order_by="SurveyQuestion.order_index"
    )
    responses: Mapped[list["SurveyResponse"]] = relationship(
        back_populates="survey", cascade="all, delete-orphan", lazy="selectin"
    )
```

- [ ] **Step 2: Create survey_question.py model**

```python
# backend/app/models/survey_question.py
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class SurveyQuestion(TimestampMixin, Base):
    __tablename__ = "survey_questions"

    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    text: Mapped[str] = mapped_column(Text)
    question_type: Mapped[str] = mapped_column(String(20), default="text")  # text | rating | choice
    order_index: Mapped[int] = mapped_column(Integer)

    survey: Mapped["Survey"] = relationship(back_populates="questions")
```

- [ ] **Step 3: Create survey_response.py model**

```python
# backend/app/models/survey_response.py
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class SurveyResponse(TimestampMixin, Base):
    __tablename__ = "survey_responses"

    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("survey_questions.id"))
    respondent_name: Mapped[str] = mapped_column(String(100), default="Anonymous")
    answer: Mapped[str] = mapped_column(Text)
    satisfaction: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5

    survey: Mapped["Survey"] = relationship(back_populates="responses")
```

- [ ] **Step 4: Update models/__init__.py, generate migration**

```bash
cd backend && alembic revision --autogenerate -m "add survey tables"
alembic upgrade head
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/ backend/alembic/
git commit -m "feat(backend): add Survey, SurveyQuestion, SurveyResponse models"
```

---

### Task 2: Survey schemas, service, and router

**Files:**
- Create: `backend/app/schemas/survey.py`
- Create: `backend/app/services/survey_service.py`
- Create: `backend/app/routers/surveys.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/routers/dashboard.py`

- [ ] **Step 1: Create survey schemas**

```python
# backend/app/schemas/survey.py
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


class SurveyResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    created_at: datetime
    questions: list[QuestionResponse] = []
    responses: list[FeedbackResponse] = []
    model_config = {"from_attributes": True}


class SurveySummary(BaseModel):
    id: str
    title: str
    status: str
    question_count: int
    response_count: int
    avg_satisfaction: float | None
    created_at: datetime


class GenerateQuestionsRequest(BaseModel):
    course_title: str
    course_style: str = ""
    course_theme: str = ""


class GenerateReplyRequest(BaseModel):
    feedback: str
    question: str
```

- [ ] **Step 2: Create survey_service.py**

```python
# backend/app/services/survey_service.py
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


async def submit_response(db: AsyncSession, survey_id: str, data: SubmitResponseRequest) -> SurveyResponseModel:
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
    result = await db.execute(select(func.count(Survey.id)).where(Survey.user_id == user_id))
    return result.scalar() or 0


async def count_responses(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(SurveyResponseModel.id))
        .join(Survey, SurveyResponseModel.survey_id == Survey.id)
        .where(Survey.user_id == user_id)
    )
    return result.scalar() or 0


async def generate_questions_with_ai(db: AsyncSession, course_title: str, course_style: str, course_theme: str) -> str:
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
```

- [ ] **Step 3: Create surveys router**

```python
# backend/app/routers/surveys.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.survey import (
    CreateSurveyRequest, SurveyResponse, SubmitResponseRequest,
    GenerateQuestionsRequest, GenerateReplyRequest,
)
from app.services import survey_service

router = APIRouter()


@router.get("/", response_model=list[SurveyResponse])
async def list_surveys(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await survey_service.list_surveys(db, user.id)


@router.get("/{survey_id}", response_model=SurveyResponse)
async def get_survey(survey_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    survey = await survey_service.get_survey(db, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey


@router.post("/", response_model=SurveyResponse, status_code=201)
async def create_survey(body: CreateSurveyRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await survey_service.create_survey(db, user.id, body)


@router.post("/{survey_id}/responses")
async def submit_response(survey_id: str, body: SubmitResponseRequest, db: AsyncSession = Depends(get_db)):
    return await survey_service.submit_response(db, survey_id, body)


@router.post("/generate-questions")
async def generate_questions(body: GenerateQuestionsRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await survey_service.generate_questions_with_ai(db, body.course_title, body.course_style, body.course_theme)
    return {"generated_content": result}


@router.post("/generate-reply")
async def generate_reply(body: GenerateReplyRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await survey_service.generate_reply_with_ai(db, body.feedback, body.question)
    return {"generated_reply": result}
```

- [ ] **Step 4: Register router in main.py, update dashboard stats**

Add surveys router to `main.py`. Update `dashboard.py` to include `surveys` and `feedbacks` counts.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/survey.py backend/app/services/survey_service.py backend/app/routers/surveys.py backend/app/main.py backend/app/routers/dashboard.py
git commit -m "feat(backend): add Survey CRUD API with AI question/reply generation"
```

---

## Chunk 2: Frontend Survey Integration

### Task 3: Frontend survey API + hooks

**Files:**
- Create: `src/types/survey.ts`
- Create: `src/api/surveys.ts`
- Create: `src/hooks/useSurveys.ts`

- [ ] **Step 1: Create types, API, hooks** (same pattern as courses)

- [ ] **Step 2: Commit**

```bash
git add src/types/survey.ts src/api/surveys.ts src/hooks/useSurveys.ts
git commit -m "feat(frontend): add survey API client and hooks"
```

---

### Task 4: Rewrite QuestionnaireManagement page

**Files:**
- Modify: `src/pages/QuestionnaireManagement.tsx`

- [ ] **Step 1: Rewrite with real API**

- Use `useSurveys()` to fetch surveys from API
- Use AI generation for questions
- Display real feedback with satisfaction ratings
- AI-generated reply suggestions
- Replace all hardcoded data

- [ ] **Step 2: Update dashboard stats to include surveys and feedbacks**

- [ ] **Step 3: Commit**

```bash
git add src/pages/QuestionnaireManagement.tsx src/pages/Dashboard.tsx
git commit -m "feat(frontend): rewrite QuestionnaireManagement with real API"
```

---

### Task 5: Backend tests + final verification

- [ ] **Step 1: Write survey CRUD tests** (`backend/tests/test_surveys.py`)
- [ ] **Step 2: Run all tests**
- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Phase C complete — Questionnaire Management with AI generation"
```

---

## Summary

Phase C delivers:
- **Backend**: Survey + SurveyQuestion + SurveyResponse models, CRUD API, AI question generation, AI reply generation
- **Frontend**: Real API integration for QuestionnaireManagement page
- **Dashboard**: Real survey and feedback counts
- **Testing**: Backend tests for survey CRUD
