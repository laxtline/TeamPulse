'use client'

import { TeamMember } from '@/types'
import { getRoleColor, getRoleColor as getRoleColorUtil } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { MoreHorizontal, UserCog, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MemberTableProps {
  members: TeamMember[]
  currentUserId: string
  currentUserRole: string
  onUpdateRole: (userId: string, role: string) => void
  onRemoveMember: (userId: string) => void
}

export function MemberTable({
  members,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onRemoveMember,
}: MemberTableProps) {
  const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 }

  const canManage = (targetRole: string) => {
    return roleHierarchy[currentUserRole as keyof typeof roleHierarchy] > roleHierarchy[targetRole as keyof typeof roleHierarchy]
  }

  const getRoleOptions = (member: TeamMember) => {
    const options: DropdownItem[] = []

    if (canManage(member.role) && member.user_id !== currentUserId) {
      ;['admin', 'member', 'viewer'].forEach((role) => {
        if (role !== member.role) {
          options.push({
            label: `Change to ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            onClick: () => onUpdateRole(member.user_id, role),
            icon: <UserCog className="h-4 w-4" />,
          })
        }
      })

      options.push({
        label: 'Remove from team',
        onClick: () => onRemoveMember(member.user_id),
        icon: <UserX className="h-4 w-4" />,
        destructive: true,
      })
    }

    return options
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-3 font-medium text-surface-500">Member</th>
            <th className="text-left p-3 font-medium text-surface-500">Role</th>
            <th className="text-left p-3 font-medium text-surface-500">Joined</th>
            <th className="text-right p-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar src={member.user_avatar_url} name={member.user_full_name} size="sm" />
                  <div>
                    <p className="font-medium">{member.user_full_name}</p>
                    <p className="text-sm text-surface-500">{member.user_email}</p>
                  </div>
                  {member.role === 'owner' && (
                    <Badge variant="secondary" className={getRoleColorUtil('owner')}>
                      Owner
                    </Badge>
                  )}
                </div>
              </td>
              <td className="p-3">
                <Badge variant="outline" className={getRoleColorUtil(member.role)}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Badge>
              </td>
              <td className="p-3 text-sm text-surface-500">
                {new Date(member.joined_at).toLocaleDateString()}
              </td>
              <td className="p-3 text-right">
                <Dropdown
                  trigger={
                    <button className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                      <MoreHorizontal className="h-5 w-5 text-surface-500" />
                    </button>
                  }
                  items={getRoleOptions(member)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}