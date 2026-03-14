import pytest
from sqlalchemy import select

from app.models.user import User
from app.models.survey import Survey
from app.models.survey_question import SurveyQuestion
from app.models.survey_response import SurveyResponse


@pytest.mark.asyncio
async def test_create_survey_with_questions(setup_db):
    from tests.conftest import TestSession

    async with TestSession() as db:
        user = User(username="surveytest", email="s@t.com", hashed_password="x", display_name="S")
        db.add(user)
        await db.flush()

        survey = Survey(title="Test Survey", user_id=user.id, status="draft")
        db.add(survey)
        await db.flush()

        q1 = SurveyQuestion(survey_id=survey.id, text="How was the class?", question_type="text", order_index=0)
        q2 = SurveyQuestion(survey_id=survey.id, text="Rate 1-5", question_type="rating", order_index=1)
        db.add_all([q1, q2])
        await db.commit()

        result = await db.execute(select(Survey).where(Survey.id == survey.id))
        fetched = result.scalar_one()
        assert fetched.title == "Test Survey"
        assert len(fetched.questions) == 2
        assert fetched.questions[0].text == "How was the class?"


@pytest.mark.asyncio
async def test_survey_cascade_delete(setup_db):
    from tests.conftest import TestSession

    async with TestSession() as db:
        user = User(username="surveydeltest", email="sd@t.com", hashed_password="x", display_name="SD")
        db.add(user)
        await db.flush()

        survey = Survey(title="Delete Me", user_id=user.id)
        db.add(survey)
        await db.flush()

        q = SurveyQuestion(survey_id=survey.id, text="Q1", order_index=0)
        db.add(q)
        await db.flush()

        resp = SurveyResponse(survey_id=survey.id, question_id=q.id, answer="Great!", satisfaction=5)
        db.add(resp)
        await db.commit()

        await db.delete(survey)
        await db.commit()

        result = await db.execute(select(SurveyQuestion).where(SurveyQuestion.survey_id == survey.id))
        assert result.scalars().all() == []

        result = await db.execute(select(SurveyResponse).where(SurveyResponse.survey_id == survey.id))
        assert result.scalars().all() == []
