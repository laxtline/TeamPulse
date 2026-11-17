'use client'

import Link from 'next/link'
import { Team } from '@/types'
import { Users, FolderKanban, Settings, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { getRoleColor } from '@/lib/utils'

interface TeamCardProps {
  team: Team
  userRole: string
}

export function TeamCard({ team, userRole }: TeamCardProps) {
  const menuItems: DropdownItem[] = [
    { label: 'Open Team', onClick: () => {}, icon: <FolderKanban className="h-4 w-4" /> },
    { label: 'Settings', onClick: () => {}, icon: <Settings className="h-4 w-4" /> },
    { label: 'Leave Team', onClick: () => {}, icon: <Users className="h-4 w-4" />, destructive: true },
  ]

  return (
    <Link
      href={`/teams/${team.slug}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <FolderKanban className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-surface-100">{team.name}</h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">@{team.slug}</p>
          </div>
        </div>
        <Dropdown
          trigger={
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          }
          items={menuItems}
        />
      </div>

      {team.description && (
        <p className="mt-3 text-sm text-surface-600 dark:text-surface-400 line-clamp-2">
          {team.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Badge variant="secondary" className={getRoleColor(userRole)}>
          {userRole}
        </Badge>
        <span className="text-sm text-surface-500 dark:text-surface-400">Member</span>
      </div>
    </Link>
  )
}