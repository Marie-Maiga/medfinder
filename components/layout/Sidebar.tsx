'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  ClipboardList,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Pill,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/requests',   label: 'Demandes',    icon: ClipboardList },
  { href: '/pharmacies', label: 'Pharmacies',  icon: Building2 },
  { href: '/analytics',  label: 'Analytique',  icon: BarChart3,  adminOnly: true },
  { href: '/settings',   label: 'Paramètres',  icon: Settings,   adminOnly: true },
]

interface SidebarProps {
  role: UserRole
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const items = NAV_ITEMS.filter(i => !i.adminOnly || role === 'admin')

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 h-screen sticky top-0 bg-gray-900 flex flex-col shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Pill className="h-6 w-6 text-blue-400" />
          <span className="text-white font-bold text-lg">MedFinder</span>
        </div>
        <p className="text-gray-500 text-xs mt-0.5">Niamey</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="px-3 mb-2">
          <p className="text-white text-sm font-medium truncate">{userName}</p>
          <p className="text-gray-500 text-xs capitalize">{role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
