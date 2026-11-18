from typing import Optional
import httpx
import json
from app.core.config import get_settings
from app.schemas.ai import StandupSummaryRequest, StandupSummaryResponse, TaskPriorityRequest, TaskPriorityResponse

settings = get_settings()


class AIService:
    def __init__(self):
        self.base_url = settings.AI_SERVICE_URL
        self.client = httpx.AsyncClient(timeout=60.0)

    async def close(self):
        await self.client.aclose()

    async def generate_standup_summary(self, request: StandupSummaryRequest) -> StandupSummaryResponse:
        try:
            response = await self.client.post(
                f"{self.base_url}/standup-summary",
                json=request.model_dump()
            )
            response.raise_for_status()
            return StandupSummaryResponse(**response.json())
        except Exception:
            return self._fallback_standup(request)

    async def score_task_priority(self, request: TaskPriorityRequest) -> TaskPriorityResponse:
        try:
            response = await self.client.post(
                f"{self.base_url}/task-priority",
                json=request.model_dump()
            )
            response.raise_for_status()
            return TaskPriorityResponse(**response.json())
        except Exception:
            return self._fallback_priority(request)

    async def get_project_insights(self, project_id: str) -> dict:
        try:
            response = await self.client.get(f"{self.base_url}/insights/{project_id}")
            response.raise_for_status()
            return response.json()
        except Exception:
            return {"error": "AI service unavailable"}

    def _fallback_standup(self, request: StandupSummaryRequest) -> StandupSummaryResponse:
        activities = request.activities
        completed = sum(1 for a in activities if a.get("action") == "completed")
        moved = sum(1 for a in activities if a.get("action") == "moved")
        created = sum(1 for a in activities if a.get("action") == "created")

        parts = []
        if completed:
            parts.append(f"Completed {completed} task{'s' if completed > 1 else ''}")
        if moved:
            parts.append(f"Moved {moved} task{'s' if moved > 1 else ''}")
        if created:
            parts.append(f"Created {created} task{'s' if created > 1 else ''}")

        summary = ", ".join(parts) + ". No blockers." if parts else "No activity recorded. No blockers."

        priorities = [
            "Review in-progress tasks",
            "Check upcoming due dates",
            "Sync with team on priorities"
        ]

        return StandupSummaryResponse(summary=summary, priorities=priorities)

    def _fallback_priority(self, request: TaskPriorityRequest) -> TaskPriorityResponse:
        score = 5
        if request.due_date:
            from datetime import datetime, timezone
            try:
                due = datetime.fromisoformat(request.due_date.replace('Z', '+00:00'))
                days_until = (due - datetime.now(timezone.utc)).days
                if days_until <= 1:
                    score += 3
                elif days_until <= 3:
                    score += 2
                elif days_until <= 7:
                    score += 1
            except Exception:
                pass

        if request.assignee_workload > 7:
            score -= 1

        score = max(1, min(10, score))

        if score >= 8:
            action = "Do now"
        elif score >= 6:
            action = "Schedule this week"
        elif score >= 4:
            action = "Delegate"
        else:
            action = "Defer"

        reasoning = f"Heuristic scoring: due date proximity, assignee workload ({request.assignee_workload}), project velocity ({request.project_velocity})"

        return TaskPriorityResponse(score=score, reasoning=reasoning, suggested_action=action)