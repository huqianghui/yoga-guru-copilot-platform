# Yoga Guru Copilot Platform

> AI-Powered Yoga Teaching Assistant Platform — 瑜伽教学 AI 助手平台

## Overview

Yoga Guru Copilot Platform is a full-stack AI-powered platform designed for yoga instructors. It provides 5 specialized AI Copilots that assist with course planning, video analysis, photo processing, questionnaire management, and general yoga guidance.

## Quick Stats

- **Backend**: 0 个 API 路由, 0 个 ORM 模型, 0 个测试文件
- **Frontend**: 0 个页面组件
- **Plans**: 0 个实施计划

## Architecture

| Layer | Tech Stack |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 6 + Tailwind CSS v4 |
| Backend | Python 3.11 + FastAPI + SQLAlchemy (async) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (python-jose + passlib) |
| AI Service | Azure OpenAI (GPT-4o) + Mock fallback |
| Video Analysis | Azure Content Understanding |
| Deployment | Azure Container Apps + ACR |
| CI/CD | GitHub Actions |

## 5 AI Copilots

| Copilot | Role | Default Page |
|---------|------|-------------|
| Yoga General | General yoga Q&A assistant | Dashboard |
| Video Analyzer | Analyze yoga teaching videos | Video Analysis |
| Course Planner | AI-powered course design | Course Planning |
| Survey Helper | Generate questionnaires & analyze feedback | Questionnaire |
| Content Creator | Photo processing & caption writing | Photo Processing |

## Development Phases

| Phase | Description | Status |
|-------|------------|--------|
| Phase D | Full-Stack Infrastructure + Agent Module | Done |
| Phase A | Course Planning Module | Todo |
| Phase C | Questionnaire Management Module | Todo |
| Phase B | Video Analysis + Photo Processing | Todo |

## Links

- [[Architecture]] — System architecture details
- [[Dev Onboarding]] — Developer setup guide
- [[Roadmap]] — Implementation roadmap
- [[Changelog]] — Version history
