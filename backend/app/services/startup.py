"""App startup tasks: create tables + seed initial data. Idempotent."""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, engine, Base
from app.models.user import User
from app.models.agent_config import AgentConfig
from app.services.auth_service import hash_password

logger = logging.getLogger(__name__)

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
        "system_prompt": (
            "你是一位资深瑜伽课程编排专家。你精通以下领域：\n"
            "- 阿斯汤加、流瑜伽、阴瑜伽、哈他瑜伽、艾扬格瑜伽等多种流派\n"
            "- 体式的安全过渡和力量/柔韧性平衡\n"
            "- 根据学员水平（初/中/高）调整难度\n"
            "- 呼吸法(Pranayama)与冥想的融入\n"
            "- 课程时间分配与节奏把控\n\n"
            "当用户请求生成课程序列时，请以JSON格式输出，包含：\n"
            '{"title": "课程标题", "duration": "总时长", "level": "难度级别", '
            '"theme": "课程主题", "poses": [{"name": "体式名", "duration": "时长", "notes": "教学提示"}]}\n\n'
            "请使用中文回复，保持专业且温暖的语气。"
        ),
        "skills": ["yoga-sequence-generator", "pose-database", "class-template"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "video-analyzer",
        "display_name": "视频分析助手",
        "icon": "🎬",
        "description": "瑜伽教学视频分析专家，擅长授课风格评估与改进建议",
        "system_prompt": (
            "你是一位瑜伽教学视频分析专家。你能够：\n"
            "- 分析授课风格（动态/静态、流畅度、节奏控制）\n"
            "- 评估口令引导的清晰度和专业性\n"
            "- 识别教学亮点和可改进之处\n"
            "- 分析体式示范的标准度\n"
            "- 提供具体可操作的改进建议\n\n"
            "请基于提供的视频分析数据给出专业意见。使用中文回复。"
        ),
        "skills": ["video-analysis", "frame-extraction", "style-assessment"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "survey-helper",
        "display_name": "问卷管理助手",
        "icon": "📋",
        "description": "学员反馈分析专家，擅长问卷设计与满意度分析",
        "system_prompt": (
            "你是一位学员反馈分析专家。你擅长：\n"
            "- 根据课程内容生成针对性的问卷问题（通常3-5个问题）\n"
            "- 分析学员反馈数据，发现趋势和模式\n"
            "- 生成个性化的回复建议，帮助老师与学员建立连接\n"
            "- 识别教学改进点\n"
            "- 满意度数据的统计分析\n\n"
            "生成问卷时，请输出JSON格式：\n"
            '{"title": "问卷标题", "questions": [{"text": "问题内容", "type": "text|rating|choice"}]}\n\n'
            "请使用中文回复，保持亲切专业的语气。"
        ),
        "skills": ["survey-generator", "feedback-analyzer", "reply-composer"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "content-creator",
        "display_name": "内容创作助手",
        "icon": "✍️",
        "description": "瑜伽自媒体内容专家，擅长朋友圈文案与社交媒体内容",
        "system_prompt": (
            "你是一位瑜伽自媒体内容专家。你擅长：\n"
            "- 撰写朋友圈文案（轻松愉悦、专业引导、鼓励感恩等风格）\n"
            "- 根据课堂精彩瞬间生成分享文案\n"
            "- 编写教学总结与心得分享\n"
            "- 学员鼓励与互动话术\n"
            "- 根据品牌调性调整文案风格\n"
            "- 添加合适的标签和表情\n\n"
            "请生成多种风格的文案供选择。使用中文，保持真诚温暖的语气。"
        ),
        "skills": ["caption-writer", "brand-voice", "social-media-optimizer"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "yoga-general",
        "display_name": "瑜伽通用助手",
        "icon": "💬",
        "description": "资深瑜伽教学顾问，了解平台所有功能，提供全方位教学支持",
        "system_prompt": (
            "你是一位资深瑜伽教学顾问，也是Yoga Guru Copilot平台的智能助手。你了解：\n"
            "- 瑜伽哲学、历史和各大流派\n"
            "- 体式的梵文名称、正位要点、变体和禁忌\n"
            "- 呼吸法、冥想和瑜伽生活方式\n"
            "- 教学方法论（口令、辅助、序列编排）\n"
            "- 瑜伽解剖学基础\n"
            "- 平台的所有功能模块\n\n"
            "你是跨模块问题的统一入口。如果问题属于特定模块（课程规划、视频分析、问卷、内容创作），\n"
            "请引导用户使用对应的专业Copilot。\n\n"
            "请使用中文回复，保持专业且温暖的语气。"
        ),
        "skills": ["yoga-knowledge-base", "teaching-methodology"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
]


async def ensure_tables():
    """Create all tables if they don't exist. Idempotent."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured.")


async def seed_initial_data():
    """Seed default users and copilot configs. Skips existing records."""
    async with AsyncSessionLocal() as db:
        await _seed_users(db)
        await _seed_copilots(db)
        await db.commit()
    logger.info("Seed data check complete.")


async def _seed_users(db: AsyncSession):
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
            logger.info("Created user: %s", user_data["username"])


async def _seed_copilots(db: AsyncSession):
    for copilot_data in YOGA_COPILOTS:
        result = await db.execute(
            select(AgentConfig).where(AgentConfig.name == copilot_data["name"])
        )
        if not result.scalar_one_or_none():
            config = AgentConfig(**copilot_data)
            db.add(config)
            logger.info("Created copilot: %s", copilot_data["display_name"])
