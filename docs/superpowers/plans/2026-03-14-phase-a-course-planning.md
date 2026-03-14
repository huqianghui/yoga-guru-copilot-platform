# Phase A: Course Planning Module — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Course Planning module with full CRUD API, AI-powered pose sequence generation via the Course Planner Copilot, and convert the existing mock frontend to use real data from the backend.

**Architecture:** RESTful API for courses + course_poses tables. The Course Planner Copilot (seeded in Phase D) generates pose sequences via Azure OpenAI. Frontend forms submit to the API, and TanStack Query manages cache invalidation. Dashboard stats become real.

**Tech Stack:** FastAPI, SQLAlchemy, TanStack Query, existing shared components

**Depends on:** Phase D (infrastructure + agent module)

---

## File Structure

### Backend (new files)

```
backend/app/
├── models/
│   ├── course.py                        # Course model
│   └── course_pose.py                   # CoursePose model (ordered poses)
├── schemas/
│   └── course.py                        # Course request/response schemas
├── routers/
│   └── courses.py                       # Course CRUD + AI generate endpoint
└── services/
    └── course_service.py                # Course business logic + AI generation
```

### Frontend (modifications)

```
src/
├── api/
│   └── courses.ts                       # Course API client
├── hooks/
│   ├── useCourses.ts                    # TanStack Query hooks for courses
│   └── useDashboard.ts                  # Update with real stats
├── types/
│   └── course.ts                        # Course types
├── pages/
│   ├── CoursePlanning.tsx               # Rewrite with real API
│   └── Dashboard.tsx                    # Connect to real stats
└── api/
    └── dashboard.ts                     # Dashboard stats API
```

---

## Chunk 1: Backend Course CRUD

### Task 1: Course models

**Files:**
- Create: `backend/app/models/course.py`
- Create: `backend/app/models/course_pose.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create course.py model**

```python
# backend/app/models/course.py
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Course(TimestampMixin, Base):
    __tablename__ = "courses"

    title: Mapped[str] = mapped_column(String(200))
    theme: Mapped[str] = mapped_column(Text, default="")
    duration: Mapped[str] = mapped_column(String(20))       # e.g., "60分钟"
    level: Mapped[str] = mapped_column(String(20))           # e.g., "中级"
    style: Mapped[str] = mapped_column(String(50))           # e.g., "流瑜伽"
    focus: Mapped[str] = mapped_column(Text, default="")     # e.g., "开髋，核心力量"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    poses: Mapped[list["CoursePose"]] = relationship(
        back_populates="course", cascade="all, delete-orphan",
        lazy="selectin", order_by="CoursePose.order_index"
    )
```

- [ ] **Step 2: Create course_pose.py model**

```python
# backend/app/models/course_pose.py
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class CoursePose(TimestampMixin, Base):
    __tablename__ = "course_poses"

    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"))
    name: Mapped[str] = mapped_column(String(100))
    duration: Mapped[str] = mapped_column(String(50))
    notes: Mapped[str] = mapped_column(Text, default="")
    order_index: Mapped[int] = mapped_column(Integer)

    course: Mapped["Course"] = relationship(back_populates="poses")
```

- [ ] **Step 3: Update models/__init__.py**

Add `Course` and `CoursePose` imports.

- [ ] **Step 4: Generate Alembic migration**

```bash
cd backend && alembic revision --autogenerate -m "add courses and course_poses tables"
alembic upgrade head
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/course.py backend/app/models/course_pose.py backend/app/models/__init__.py backend/alembic/
git commit -m "feat(backend): add Course and CoursePose models"
```

---

### Task 2: Course schemas + service

**Files:**
- Create: `backend/app/schemas/course.py`
- Create: `backend/app/services/course_service.py`

- [ ] **Step 1: Create course schemas**

```python
# backend/app/schemas/course.py
from datetime import datetime
from pydantic import BaseModel


class PoseInput(BaseModel):
    name: str
    duration: str
    notes: str = ""


class CreateCourseRequest(BaseModel):
    title: str
    theme: str = ""
    duration: str
    level: str
    style: str
    focus: str = ""
    poses: list[PoseInput] = []


class UpdateCourseRequest(BaseModel):
    title: str | None = None
    theme: str | None = None
    duration: str | None = None
    level: str | None = None
    style: str | None = None
    focus: str | None = None


class PoseResponse(BaseModel):
    id: str
    name: str
    duration: str
    notes: str
    order_index: int

    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    id: str
    title: str
    theme: str
    duration: str
    level: str
    style: str
    focus: str
    created_at: datetime
    poses: list[PoseResponse] = []

    model_config = {"from_attributes": True}


class GenerateCourseRequest(BaseModel):
    theme: str
    duration: str
    level: str
    style: str
    focus: str = ""
```

- [ ] **Step 2: Create course_service.py**

```python
# backend/app/services/course_service.py
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.course import Course
from app.models.course_pose import CoursePose
from app.schemas.course import CreateCourseRequest, GenerateCourseRequest
from app.services.agents.base import AgentRequest, AgentContext
from app.services.agents.dispatcher import dispatch


async def create_course(db: AsyncSession, user_id: str, data: CreateCourseRequest) -> Course:
    course = Course(
        title=data.title,
        theme=data.theme,
        duration=data.duration,
        level=data.level,
        style=data.style,
        focus=data.focus,
        user_id=user_id,
    )
    db.add(course)
    await db.flush()

    for i, pose in enumerate(data.poses):
        db.add(CoursePose(
            course_id=course.id,
            name=pose.name,
            duration=pose.duration,
            notes=pose.notes,
            order_index=i,
        ))

    await db.commit()
    await db.refresh(course)
    return course


async def list_courses(db: AsyncSession, user_id: str) -> list[Course]:
    result = await db.execute(
        select(Course)
        .where(Course.user_id == user_id)
        .order_by(Course.created_at.desc())
    )
    return list(result.scalars().all())


async def get_course(db: AsyncSession, course_id: str) -> Course | None:
    result = await db.execute(select(Course).where(Course.id == course_id))
    return result.scalar_one_or_none()


async def delete_course(db: AsyncSession, course_id: str) -> bool:
    course = await get_course(db, course_id)
    if course:
        await db.delete(course)
        await db.commit()
        return True
    return False


async def count_courses(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(Course.id)).where(Course.user_id == user_id)
    )
    return result.scalar() or 0


async def generate_course_with_ai(db: AsyncSession, data: GenerateCourseRequest) -> str:
    """Use the course-planner Copilot to generate a course sequence.
    Returns the raw AI response text (JSON expected)."""
    prompt = f"""请为我生成一个课程序列：
- 课程主题：{data.theme or data.style + '课程'}
- 课程时长：{data.duration}
- 难度级别：{data.level}
- 课程类型：{data.style}
- 课程重点：{data.focus or '综合练习'}

请严格按照JSON格式输出课程序列。"""

    request = AgentRequest(
        prompt=prompt,
        agent_name="course-planner",
        context=AgentContext(module="course-planning"),
    )

    full_response = ""
    async for event in dispatch(db, "course-planner", request):
        if event.type == "text":
            full_response += event.content

    return full_response
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/course.py backend/app/services/course_service.py
git commit -m "feat(backend): add course service with AI generation support"
```

---

### Task 3: Course router

**Files:**
- Create: `backend/app/routers/courses.py`
- Modify: `backend/app/main.py` (register router)
- Modify: `backend/app/routers/dashboard.py` (add real course count)

- [ ] **Step 1: Create courses router**

```python
# backend/app/routers/courses.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.course import (
    CreateCourseRequest, CourseResponse, GenerateCourseRequest,
)
from app.services import course_service

router = APIRouter()


@router.get("/", response_model=list[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await course_service.list_courses(db, user.id)


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


@router.post("/", response_model=CourseResponse, status_code=201)
async def create_course(
    body: CreateCourseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await course_service.create_course(db, user.id, body)


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    deleted = await course_service.delete_course(db, course_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Course not found")


@router.post("/generate")
async def generate_course(
    body: GenerateCourseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """AI-generate a course sequence using the Course Planner Copilot."""
    result = await course_service.generate_course_with_ai(db, body)
    return {"generated_content": result}
```

- [ ] **Step 2: Register router in main.py**

Add to `backend/app/main.py`:
```python
from app.routers import courses
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
```

- [ ] **Step 3: Update dashboard.py with real course count**

```python
# Update backend/app/routers/dashboard.py
from app.services.course_service import count_courses

@router.get("/stats")
async def get_stats(db, user):
    courses_count = await count_courses(db, user.id)
    return {
        "videos": 0,
        "courses": courses_count,
        "feedbacks": 0,
        "surveys": 0,
    }
```

- [ ] **Step 4: Test endpoint**

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"username":"guru","password":"guru123"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Create a course
curl -X POST http://localhost:8000/api/courses/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"title":"Test Course","duration":"60分钟","level":"中级","style":"流瑜伽","poses":[{"name":"山式","duration":"2分钟","notes":"调整呼吸"}]}'

# List courses
curl http://localhost:8000/api/courses/ -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/courses.py backend/app/main.py backend/app/routers/dashboard.py
git commit -m "feat(backend): add Course CRUD API with AI generation endpoint"
```

---

## Chunk 2: Frontend Course Integration

### Task 4: Frontend course API + hooks

**Files:**
- Create: `src/types/course.ts`
- Create: `src/api/courses.ts`
- Create: `src/hooks/useCourses.ts`
- Create: `src/api/dashboard.ts`
- Create: `src/hooks/useDashboard.ts`

- [ ] **Step 1: Create course types**

```typescript
// src/types/course.ts
export interface Pose {
  id?: string;
  name: string;
  duration: string;
  notes: string;
  order_index?: number;
}

export interface Course {
  id: string;
  title: string;
  theme: string;
  duration: string;
  level: string;
  style: string;
  focus: string;
  created_at: string;
  poses: Pose[];
}

export interface CreateCourseRequest {
  title: string;
  theme?: string;
  duration: string;
  level: string;
  style: string;
  focus?: string;
  poses: Pose[];
}

export interface GenerateCourseRequest {
  theme: string;
  duration: string;
  level: string;
  style: string;
  focus?: string;
}
```

- [ ] **Step 2: Create courses API**

```typescript
// src/api/courses.ts
import { apiClient } from "./client";
import type { Course, CreateCourseRequest, GenerateCourseRequest } from "@/types/course";

export const coursesApi = {
  list: () => apiClient.get<Course[]>("/courses/").then((r) => r.data),
  get: (id: string) => apiClient.get<Course>(`/courses/${id}`).then((r) => r.data),
  create: (data: CreateCourseRequest) => apiClient.post<Course>("/courses/", data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/courses/${id}`),
  generate: (data: GenerateCourseRequest) =>
    apiClient.post<{ generated_content: string }>("/courses/generate", data).then((r) => r.data),
};
```

- [ ] **Step 3: Create useCourses hook**

```typescript
// src/hooks/useCourses.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "@/api/courses";
import type { CreateCourseRequest, GenerateCourseRequest } from "@/types/course";

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: coursesApi.list,
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ["courses", id],
    queryFn: () => coursesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCourseRequest) => coursesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useGenerateCourse() {
  return useMutation({
    mutationFn: (data: GenerateCourseRequest) => coursesApi.generate(data),
  });
}
```

- [ ] **Step 4: Create dashboard API + hook**

```typescript
// src/api/dashboard.ts
import { apiClient } from "./client";

export interface DashboardStats {
  videos: number;
  courses: number;
  feedbacks: number;
  surveys: number;
}

export const dashboardApi = {
  getStats: () => apiClient.get<DashboardStats>("/dashboard/stats").then((r) => r.data),
};
```

```typescript
// src/hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardApi.getStats,
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/types/course.ts src/api/courses.ts src/api/dashboard.ts src/hooks/useCourses.ts src/hooks/useDashboard.ts
git commit -m "feat(frontend): add course API client, hooks, and dashboard stats"
```

---

### Task 5: Rewrite CoursePlanning page with real API

**Files:**
- Modify: `src/pages/CoursePlanning.tsx`

- [ ] **Step 1: Rewrite CoursePlanning.tsx**

Replace the entire file to:
- Use `useCourses()` hook to fetch real courses from API
- Use `useCreateCourse()` mutation to save courses
- Use `useGenerateCourse()` mutation to AI-generate sequences
- Parse AI-generated JSON into course poses
- Keep the same Glassmorphism UI structure (PageHeader, GlassCard, etc.)
- Replace hardcoded `savedSequences` with `courses.data`
- Replace `setTimeout` in `handleGenerate` with real API call

Key changes:
- Form state uses controlled inputs with `useState`
- `handleGenerate` calls `generateMutation.mutateAsync()` → parses JSON → populates pose list
- "Save" button calls `createMutation.mutateAsync()` with poses
- Course list renders from `useQuery` data
- Delete button calls `useDeleteCourse()`

- [ ] **Step 2: Verify**

```bash
# Start backend + frontend
# 1. Navigate to /course-planning
# 2. Click "创建新序列"
# 3. Fill form, click "智能生成序列"
# 4. Verify AI response populates poses (or mock response shows)
# 5. Save the course
# 6. Verify it appears in the list
# 7. Navigate to Dashboard → course count updates
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/CoursePlanning.tsx
git commit -m "feat(frontend): rewrite CoursePlanning with real API and AI generation"
```

---

### Task 6: Update Dashboard with real stats

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Update Dashboard to use real stats**

- Import `useDashboardStats` hook
- Replace hardcoded stats values with `stats.data?.courses`, etc.
- Show loading skeleton while fetching
- Keep recent activity as mock for now (will be real in later phases)

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(frontend): connect Dashboard stats to real API"
```

---

### Task 7: Backend test for courses

**Files:**
- Create: `backend/tests/test_courses.py`

- [ ] **Step 1: Write course CRUD tests**

```python
# backend/tests/test_courses.py
import pytest


async def get_auth_token(client) -> str:
    await client.post("/api/auth/register", json={
        "username": "coursetest",
        "email": "course@test.com",
        "password": "test123",
        "display_name": "Course Tester",
    })
    resp = await client.post("/api/auth/login", json={
        "username": "coursetest",
        "password": "test123",
    })
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_and_list_courses(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Create course
    resp = await client.post("/api/courses/", headers=headers, json={
        "title": "Test Yoga Course",
        "duration": "60分钟",
        "level": "中级",
        "style": "流瑜伽",
        "poses": [
            {"name": "山式", "duration": "2分钟", "notes": "调整呼吸"},
            {"name": "下犬式", "duration": "5次呼吸", "notes": "拉伸"},
        ],
    })
    assert resp.status_code == 201
    course = resp.json()
    assert course["title"] == "Test Yoga Course"
    assert len(course["poses"]) == 2

    # List courses
    resp = await client.get("/api/courses/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Delete
    resp = await client.delete(f"/api/courses/{course['id']}", headers=headers)
    assert resp.status_code == 204
```

- [ ] **Step 2: Run tests**

```bash
cd backend && python -m pytest tests/test_courses.py -v
```

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_courses.py
git commit -m "test(backend): add course CRUD tests"
```

- [ ] **Step 4: Final Phase A commit**

```bash
git add -A
git commit -m "feat: Phase A complete — Course Planning with real API and AI generation"
```

---

## Summary

Phase A delivers:
- **Backend**: Course + CoursePose models, CRUD API, AI generation endpoint using Course Planner Copilot
- **Frontend**: Real API integration for CoursePlanning page, TanStack Query hooks, form → API → database flow
- **Dashboard**: Real course count from API
- **Testing**: Backend tests for course CRUD
