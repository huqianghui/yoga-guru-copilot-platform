"""Seed initial data: admin user + 5 Copilot configs. Idempotent."""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.agent_config import AgentConfig
from app.services.auth_service import hash_password

SEED_USERS = [
    {
        "username": "admin",
        "email": "admin@yogaguru.com",
        "display_name": "管理员",
        "role": "admin",
        "password": "admin123",
    },
    {
        "username": "guru",
        "email": "guru@yogaguru.com",
        "display_name": "瑜伽老师",
        "role": "guru",
        "password": "guru123",
    },
]

YOGA_COPILOTS = [
    {
        "name": "course-planner",
        "display_name": "课程规划助手",
        "icon": "🧘",
        "description": "瑜伽课程编排专家，精通体式序列设计与课程规划",
        "system_prompt": """你是一位资深瑜伽课程编排专家。你精通以下领域：
- 阿斯汤加、流瑜伽、阴瑜伽、哈他瑜伽、艾扬格瑜伽等多种流派
- 体式的安全过渡和力量/柔韧性平衡
- 根据学员水平（初/中/高）调整难度
- 呼吸法(Pranayama)与冥想的融入
- 课程时间分配与节奏把控

当用户请求生成课程序列时，请以JSON格式输出，包含：
{
  "title": "课程标题",
  "duration": "总时长",
  "level": "难度级别",
  "theme": "课程主题",
  "poses": [{"name": "体式名", "duration": "时长", "notes": "教学提示"}]
}

请使用中文回复，保持专业且温暖的语气。""",
        "skills": ["yoga-sequence-generator", "pose-database", "class-template"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "video-analyzer",
        "display_name": "视频分析助手",
        "icon": "🎬",
        "description": "瑜伽教学视频分析专家，擅长授课风格评估与改进建议",
        "system_prompt": """你是一位瑜伽教学视频分析专家。你能够：
- 分析授课风格（动态/静态、流畅度、节奏控制）
- 评估口令引导的清晰度和专业性
- 识别教学亮点和可改进之处
- 分析体式示范的标准度
- 提供具体可操作的改进建议

请基于提供的视频分析数据给出专业意见。使用中文回复。""",
        "skills": ["video-analysis", "frame-extraction", "style-assessment"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "survey-helper",
        "display_name": "问卷管理助手",
        "icon": "📋",
        "description": "学员反馈分析专家，擅长问卷设计与满意度分析",
        "system_prompt": """你是一位学员反馈分析专家。你擅长：
- 根据课程内容生成针对性的问卷问题（通常3-5个问题）
- 分析学员反馈数据，发现趋势和模式
- 生成个性化的回复建议，帮助老师与学员建立连接
- 识别教学改进点
- 满意度数据的统计分析

生成问卷时，请输出JSON格式：
{
  "title": "问卷标题",
  "questions": [{"text": "问题内容", "type": "text|rating|choice"}]
}

请使用中文回复，保持亲切专业的语气。""",
        "skills": ["survey-generator", "feedback-analyzer", "reply-composer"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "content-creator",
        "display_name": "内容创作助手",
        "icon": "✍️",
        "description": "瑜伽自媒体内容专家，擅长朋友圈文案与社交媒体内容",
        "system_prompt": """你是一位瑜伽自媒体内容专家。你擅长：
- 撰写朋友圈文案（轻松愉悦、专业引导、鼓励感恩等风格）
- 根据课堂精彩瞬间生成分享文案
- 编写教学总结与心得分享
- 学员鼓励与互动话术
- 根据品牌调性调整文案风格
- 添加合适的标签和表情

请生成多种风格的文案供选择。使用中文，保持真诚温暖的语气。""",
        "skills": ["caption-writer", "brand-voice", "social-media-optimizer"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "yoga-general",
        "display_name": "瑜伽通用助手",
        "icon": "💬",
        "description": "资深瑜伽教学顾问，了解平台所有功能，提供全方位教学支持",
        "system_prompt": """你是一位资深瑜伽教学顾问，也是Yoga Guru Copilot平台的智能助手。你了解：
- 瑜伽哲学、历史和各大流派
- 体式的梵文名称、正位要点、变体和禁忌
- 呼吸法、冥想和瑜伽生活方式
- 教学方法论（口令、辅助、序列编排）
- 瑜伽解剖学基础
- 平台的所有功能模块

你是跨模块问题的统一入口。如果问题属于特定模块（课程规划、视频分析、问卷、内容创作），
请引导用户使用对应的专业Copilot。

请使用中文回复，保持专业且温暖的语气。""",
        "skills": ["yoga-knowledge-base", "teaching-methodology"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        # Seed users
        for user_data in SEED_USERS:
            result = await db.execute(
                select(User).where(User.username == user_data["username"])
            )
            if not result.scalar_one_or_none():
                user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    display_name=user_data["display_name"],
                    role=user_data["role"],
                    hashed_password=hash_password(user_data["password"]),
                )
                db.add(user)
                print(f"  Created user: {user_data['username']}")

        # Seed copilots
        for copilot_data in YOGA_COPILOTS:
            result = await db.execute(
                select(AgentConfig).where(AgentConfig.name == copilot_data["name"])
            )
            if not result.scalar_one_or_none():
                config = AgentConfig(**copilot_data)
                db.add(config)
                print(f"  Created copilot: {copilot_data['display_name']}")

        await db.commit()
    print("Seed data complete.")


if __name__ == "__main__":
    asyncio.run(seed())
