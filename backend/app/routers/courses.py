from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.course import (
    CreateCourseRequest,
    UpdateCourseRequest,
    CourseResponse,
    GenerateCourseRequest,
)
from app.services import course_service

router = APIRouter()


@router.get("/", response_model=list[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await course_service.list_courses(db, user.id)


@router.post("/generate")
async def generate_course(
    body: GenerateCourseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """AI-generate a course sequence using the Course Planner Copilot."""
    result = await course_service.generate_course_with_ai(db, body)
    return {"generated_content": result}


@router.post("/", response_model=CourseResponse, status_code=201)
async def create_course(
    body: CreateCourseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await course_service.create_course(db, user.id, body)


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    course = await course_service.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    body: UpdateCourseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    course = await course_service.update_course(db, course_id, body)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    deleted = await course_service.delete_course(db, course_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Course not found")
