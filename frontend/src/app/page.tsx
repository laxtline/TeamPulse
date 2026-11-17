import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-white dark:from-surface-900 dark:to-surface-950 p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-6">
          TeamPulse
        </h1>
        <p className="text-xl text-surface-600 dark:text-surface-300 mb-8">
          Real-time team collaboration with AI-powered insights.
          Kanban boards, live updates, and smart task prioritization.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login" className="btn-primary text-lg px-8">
            Get Started
          </Link>
          <Link href="/login" className="btn-secondary text-lg px-8">
            Demo Login
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Real-time Kanban</h3>
            <p className="text-surface-600 dark:text-surface-300">
              Drag-and-drop task boards that sync instantly across all team members.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
            <p className="text-surface-600 dark:text-surface-300">
              Daily standup summaries and smart task priority scoring powered by Groq AI.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Team Workspaces</h3>
            <p className="text-surface-600 dark:text-surface-300">
              Multi-tenant teams with role-based access control and OAuth2 login.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}