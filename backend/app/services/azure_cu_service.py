"""Azure Content Understanding integration for video analysis."""
import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

API_VERSION = "2024-12-01-preview"


async def analyze_video_with_cu(
    endpoint: str, key: str, video_url: str
) -> dict:
    """Submit video for analysis and poll until completion.

    Args:
        endpoint: Azure CU endpoint URL
        key: Azure CU subscription key
        video_url: Publicly accessible URL of the video file

    Returns:
        Analysis result dict with teaching_style, rhythm, etc.
    """
    base_url = endpoint.rstrip("/")
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
    }

    # Create analyzer (if not exists, this is idempotent)
    analyzer_id = "yoga-video-analyzer"
    analyzer_url = f"{base_url}/contentunderstanding/analyzers/{analyzer_id}?api-version={API_VERSION}"

    analyzer_body = {
        "description": "Yoga teaching video analyzer",
        "scenario": "videoAnalysis",
        "fieldSchema": {
            "fields": {
                "teaching_style": {
                    "type": "string",
                    "description": "The teaching style observed (e.g., 温和引导型, 力量激励型)",
                },
                "rhythm": {
                    "type": "string",
                    "description": "Teaching rhythm (e.g., 缓慢流畅, 快节奏)",
                },
                "guidance_method": {
                    "type": "string",
                    "description": "Primary guidance method (e.g., 口令引导, 示范引导)",
                },
                "core_philosophy": {
                    "type": "string",
                    "description": "Core teaching philosophy summary",
                },
                "key_moments": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "timestamp": {"type": "string"},
                            "description": {"type": "string"},
                            "frame_type": {"type": "string", "enum": ["quality", "teaching"]},
                            "pose_name": {"type": "string"},
                        },
                    },
                    "description": "Key moments in the video with timestamps",
                },
            }
        },
    }

    async with httpx.AsyncClient(timeout=60) as client:
        # Create/update analyzer
        resp = await client.put(analyzer_url, headers=headers, json=analyzer_body)
        if resp.status_code not in (200, 201):
            logger.warning(f"Analyzer creation returned {resp.status_code}: {resp.text[:200]}")

        # Submit analysis job
        analyze_url = f"{base_url}/contentunderstanding/analyzers/{analyzer_id}:analyze?api-version={API_VERSION}"
        analyze_body = {"url": video_url}

        resp = await client.post(analyze_url, headers=headers, json=analyze_body)
        if resp.status_code not in (200, 202):
            raise RuntimeError(f"Video analysis submission failed: {resp.status_code} {resp.text[:200]}")

        result_data = resp.json()

        # If 202, poll for completion
        if resp.status_code == 202:
            operation_url = resp.headers.get("Operation-Location", "")
            if not operation_url:
                raise RuntimeError("No Operation-Location header in 202 response")

            for _ in range(60):  # Poll up to 5 minutes
                await asyncio.sleep(5)
                poll_resp = await client.get(operation_url, headers=headers)
                poll_data = poll_resp.json()
                status = poll_data.get("status", "")
                if status == "succeeded":
                    result_data = poll_data.get("result", poll_data)
                    break
                elif status in ("failed", "canceled"):
                    raise RuntimeError(f"Analysis {status}: {poll_data}")
            else:
                raise RuntimeError("Analysis timed out after 5 minutes")

    # Parse results into our expected format
    fields = result_data.get("contents", [{}])[0].get("fields", result_data.get("fields", {}))

    return {
        "teaching_style": fields.get("teaching_style", {}).get("valueString", "未识别"),
        "rhythm": fields.get("rhythm", {}).get("valueString", "未识别"),
        "guidance_method": fields.get("guidance_method", {}).get("valueString", "未识别"),
        "core_philosophy": fields.get("core_philosophy", {}).get("valueString", ""),
        "key_moments": fields.get("key_moments", {}).get("valueArray", []),
        "raw_result": result_data,
    }
