import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import init_db, async_session_maker
from app.models.user import User
from app.models.team import Team, TeamMember
from app.models.project import Project
from app.models.task import Task
from app.models.comment import Comment
from app.core.security import get_password_hash


async def seed():
    await init_db()
    async with async_session_maker() as db:
        # Create demo users
        users_data = [
            {
                "email": "admin@teampulse.ac",
                "password": "Passcode@9938",
                "full_name": "SURYA",
                "role": "admin"
            },
            {
                "email": "arjun@teampulse.ac",
                "password": "Passcode@9938",
                "full_name": "Arjun Sharma",
                "role": "member"
            },
            {
                "email": "priya@teampulse.ac",
                "password": "Passcode@9938",
                "full_name": "Priya Patel",
                "role": "member"
            },
            {
                "email": "rohan@teampulse.ac",
                "password": "Passcode@9938",
                "full_name": "Rohan Verma",
                "role": "member"
            },
        ]

        users = []
        for u_data in users_data:
            result = await db.execute(select(User).where(User.email == u_data["email"]))
            user = result.scalar_one_or_none()
            if not user:
                user = User(
                    email=u_data["email"],
                    password_hash=get_password_hash(u_data["password"]),
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    email_verified=True,
                )
                db.add(user)
                await db.flush()
            users.append(user)

        admin_user, arjun, priya, rohan = users

        # Create demo team
        result = await db.execute(select(Team).where(Team.slug == "acme-corp"))
        team = result.scalar_one_or_none()
        if not team:
            team = Team(
                name="Acme Corp",
                slug="acme-corp",
                description="Demo team for TeamPulse",
                owner_id=arjun.id,
            )
            db.add(team)
            await db.flush()

            # Add members
            for user, role in [(arjun, "owner"), (priya, "admin"), (rohan, "member")]:
                member = TeamMember(team_id=team.id, user_id=user.id, role=role)
                db.add(member)

        # Create projects
        projects_data = [
            {"name": "Website Redesign", "key_prefix": "WEB", "description": "Complete website overhaul"},
            {"name": "Mobile App v2", "key_prefix": "MOB", "description": "Next generation mobile app"},
            {"name": "API Integration", "key_prefix": "API", "description": "Third-party API integrations"},
        ]

        projects = []
        for p_data in projects_data:
            result = await db.execute(select(Project).where(Project.key_prefix == p_data["key_prefix"], Project.team_id == team.id))
            project = result.scalar_one_or_none()
            if not project:
                project = Project(team_id=team.id, **p_data)
                db.add(project)
                await db.flush()
            projects.append(project)

        web_project, mob_project, api_project = projects

        # Create tasks for Website Redesign
        web_tasks = [
            {"title": "Design new homepage", "status": "done", "priority": "high", "assignee": priya, "story_points": 5},
            {"title": "Implement responsive navigation", "status": "done", "priority": "medium", "assignee": rohan, "story_points": 3},
            {"title": "Create style guide", "status": "review", "priority": "medium", "assignee": priya, "story_points": 2},
            {"title": "Build landing page components", "status": "in_progress", "priority": "high", "assignee": arjun, "story_points": 8},
            {"title": "Optimize images and assets", "status": "todo", "priority": "low", "assignee": rohan, "story_points": 2},
            {"title": "Set up CI/CD pipeline", "status": "backlog", "priority": "high", "assignee": arjun, "story_points": 5},
            {"title": "Write documentation", "status": "backlog", "priority": "low", "assignee": priya, "story_points": 3},
            {"title": "Cross-browser testing", "status": "backlog", "priority": "medium", "assignee": rohan, "story_points": 3},
            {"title": "Performance audit", "status": "backlog", "priority": "medium", "assignee": arjun, "story_points": 5},
            {"title": "Accessibility review", "status": "backlog", "priority": "high", "assignee": priya, "story_points": 5},
            {"title": "Deploy to staging", "status": "backlog", "priority": "high", "assignee": arjun, "story_points": 2},
            {"title": "Launch to production", "status": "backlog", "priority": "urgent", "assignee": arjun, "story_points": 3},
        ]

        for i, t_data in enumerate(web_tasks):
            assignee = t_data.pop("assignee")
            result = await db.execute(select(Task).where(Task.title == t_data["title"], Task.project_id == web_project.id))
            if not result.scalar_one_or_none():
                due_date = datetime.now(timezone.utc) + timedelta(days=7 + i * 2)
                task = Task(
                    project_id=web_project.id,
                    reporter_id=arjun.id,
                    assignee_id=assignee.id,
                    position=float(i * 10),
                    due_date=due_date,
                    **t_data
                )
                db.add(task)

        # Create tasks for Mobile App v2
        mob_tasks = [
            {"title": "Design app screens", "status": "done", "priority": "high", "assignee": priya, "story_points": 8},
            {"title": "Set up React Native project", "status": "done", "priority": "high", "assignee": rohan, "story_points": 5},
            {"title": "Implement authentication flow", "status": "in_progress", "priority": "high", "assignee": arjun, "story_points": 8},
            {"title": "Build home screen", "status": "todo", "priority": "medium", "assignee": priya, "story_points": 5},
            {"title": "Add push notifications", "status": "backlog", "priority": "medium", "assignee": rohan, "story_points": 5},
            {"title": "Implement offline mode", "status": "backlog", "priority": "high", "assignee": arjun, "story_points": 8},
            {"title": "App store preparation", "status": "backlog", "priority": "medium", "assignee": priya, "story_points": 3},
            {"title": "Beta testing", "status": "backlog", "priority": "high", "assignee": arjun, "story_points": 5},
        ]

        for i, t_data in enumerate(mob_tasks):
            assignee = t_data.pop("assignee")
            result = await db.execute(select(Task).where(Task.title == t_data["title"], Task.project_id == mob_project.id))
            if not result.scalar_one_or_none():
                due_date = datetime.now(timezone.utc) + timedelta(days=5 + i * 3)
                task = Task(
                    project_id=mob_project.id,
                    reporter_id=arjun.id,
                    assignee_id=assignee.id,
                    position=float(i * 10),
                    due_date=due_date,
                    **t_data
                )
                db.add(task)

        # Create tasks for API Integration
        api_tasks = [
            {"title": "Design API specification", "status": "done", "priority": "high", "assignee": arjun, "story_points": 3},
            {"title": "Implement payment gateway", "status": "in_progress", "priority": "urgent", "assignee": rohan, "story_points": 8},
            {"title": "Add webhook handlers", "status": "review", "priority": "high", "assignee": priya, "story_points": 5},
            {"title": "Write API tests", "status": "todo", "priority": "medium", "assignee": arjun, "story_points": 5},
            {"title": "Rate limiting", "status": "backlog", "priority": "high", "assignee": rohan, "story_points": 3},
            {"title": "Documentation", "status": "backlog", "priority": "low", "assignee": priya, "story_points": 2},
        ]

        for i, t_data in enumerate(api_tasks):
            assignee = t_data.pop("assignee")
            result = await db.execute(select(Task).where(Task.title == t_data["title"], Task.project_id == api_project.id))
            if not result.scalar_one_or_none():
                due_date = datetime.now(timezone.utc) + timedelta(days=3 + i * 2)
                task = Task(
                    project_id=api_project.id,
                    reporter_id=arjun.id,
                    assignee_id=assignee.id,
                    position=float(i * 10),
                    due_date=due_date,
                    **t_data
                )
                db.add(task)

        await db.commit()
        print("Seed data created successfully!")
        print("\nDemo accounts:")
        print("  admin@teampulse.ac / Passcode@9938")
        print("  arjun@teampulse.ac / Passcode@9938")
        print("  priya@teampulse.ac / Passcode@9938")
        print("  rohan@teampulse.ac / Passcode@9938")


if __name__ == "__main__":
    asyncio.run(seed())