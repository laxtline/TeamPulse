from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class StandupSummaryRequest(BaseModel):
    user_name: str
    activities: list[dict]
    date: str


class StandupSummaryResponse(BaseModel):
    summary: str
    priorities: list[str]


class TaskPriorityRequest(BaseModel):
    task_title: str
    task_description: Optional[str] = None
    due_date: Optional[str] = None
    assignee_workload: int = 0
    project_velocity: float = 0.0


class TaskPriorityResponse(BaseModel):
    score: int = Field(ge=1, le=10)
    reasoning: str
    suggested_action: str = Field(pattern="^(Do now|Schedule this week|Delegate|Defer)$")


class ProjectInsightsRequest(BaseModel):
    project_id: str


class ProjectInsightsResponse(BaseModel):
    velocity_trend: list[dict]
    workload_distribution: list[dict]
    ai_summary: str


class ProjectSummaryRequest(BaseModel):
    project_name: str
    total_tasks: int
    status_counts: dict[str, int]
    total_points: int
    done_points: int
    overdue: int
    workload: list[dict]