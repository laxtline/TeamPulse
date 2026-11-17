from fastapi import FastAPI
from groq_client import groq_client
from prompts import STANDUP_SYSTEM_PROMPT, TASK_PRIORITY_SYSTEM_PROMPT
from schemas import (
    StandupSummaryRequest,
    StandupSummaryResponse,
    TaskPriorityRequest,
    TaskPriorityResponse,
)
import httpx


app = FastAPI(title="TeamPulse AI Service", version="1.0.0")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "teampulse-ai"}


@app.post("/standup-summary", response_model=StandupSummaryResponse)
async def generate_standup_summary(request: StandupSummaryRequest):
    activities_text = "\n".join([
        f"- {a['action'].title()}: {a.get('task_title', 'Unknown')} ({a.get('task_status', 'unknown')}) at {a.get('timestamp', '')}"
        for a in request.activities
    ])

    user_prompt = f"""Generate a standup summary for {request.user_name} on {request.date}.

Activities:
{activities_text if activities_text else "No activities recorded."}

Format:
SUMMARY: <concise summary>
PRIORITIES:
1. <priority 1>
2. <priority 2>
3. <priority 3>"""

    try:
        response = await groq_client.chat_completion(
            messages=[
                {"role": "system", "content": STANDUP_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )

        content = response.choices[0].message.content
        summary = ""
        priorities = []

        for line in content.split("\n"):
            if line.startswith("SUMMARY:"):
                summary = line.replace("SUMMARY:", "").strip()
            elif line.strip().startswith(("1.", "2.", "3.")):
                priorities.append(line.strip()[3:].strip())

        if not summary:
            summary = "Completed tasks and moved items forward. No blockers."
        if not priorities:
            priorities = [
                "Review in-progress tasks",
                "Check upcoming due dates",
                "Sync with team on priorities"
            ]

        return StandupSummaryResponse(summary=summary, priorities=priorities[:3])

    except Exception:
        # Fallback
        completed = sum(1 for a in request.activities if a.get("action") == "completed")
        moved = sum(1 for a in request.activities if a.get("action") == "moved")

        parts = []
        if completed:
            parts.append(f"Completed {completed} task{'s' if completed > 1 else ''}")
        if moved:
            parts.append(f"Moved {moved} task{'s' if moved > 1 else ''}")

        summary = ", ".join(parts) + ". No blockers." if parts else "No activity recorded. No blockers."
        priorities = [
            "Review in-progress tasks",
            "Check upcoming due dates",
            "Sync with team on priorities"
        ]

        return StandupSummaryResponse(summary=summary, priorities=priorities)


@app.post("/task-priority", response_model=TaskPriorityResponse)
async def score_task_priority(request: TaskPriorityRequest):
    user_prompt = f"""Score this task priority 1-10.

Task: {request.task_title}
Description: {request.task_description or 'No description'}
Due date: {request.due_date or 'No due date'}
Assignee workload: {request.assignee_workload} tasks
Project velocity: {request.project_velocity} points/sprint

Scoring factors:
- Due date proximity (0-3 pts): sooner = higher
- Assignee workload inverse (0-2 pts): less busy = higher
- Project velocity context (0-2 pts): faster project = higher
- Keyword urgency (0-3 pts): blocker, critical, urgent, security = higher

Format:
SCORE: <1-10>
REASONING: <explanation>
ACTION: <Do now | Schedule this week | Delegate | Defer>"""

    try:
        response = await groq_client.chat_completion(
            messages=[
                {"role": "system", "content": TASK_PRIORITY_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=200
        )

        content = response.choices[0].message.content
        score = 5
        reasoning = "AI scoring failed, using fallback"
        action = "Schedule this week"

        for line in content.split("\n"):
            if line.startswith("SCORE:"):
                try:
                    score = int(line.replace("SCORE:", "").strip())
                except Exception:
                    pass
            elif line.startswith("REASONING:"):
                reasoning = line.replace("REASONING:", "").strip()
            elif line.startswith("ACTION:"):
                action = line.replace("ACTION:", "").strip()

        score = max(1, min(10, score))
        valid_actions = ["Do now", "Schedule this week", "Delegate", "Defer"]
        if action not in valid_actions:
            if score >= 8:
                action = "Do now"
            elif score >= 6:
                action = "Schedule this week"
            elif score >= 4:
                action = "Delegate"
            else:
                action = "Defer"

        return TaskPriorityResponse(score=score, reasoning=reasoning, suggested_action=action)

    except Exception:
        # Fallback heuristic
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


@app.get("/insights/{project_id}")
async def get_project_insights(project_id: str):
    return {
        "project_id": project_id,
        "velocity_trend": [],
        "workload_distribution": [],
        "ai_summary": "AI insights not yet implemented for this endpoint"
    }