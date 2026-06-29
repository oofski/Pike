import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Vote,
  MessageSquareText,
  Settings,
  LogOut
} from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { UpdateButton } from '@/components/UpdateButton'
import { cn, initials } from '@/lib/utils'
import { BRAND } from '@shared/branding'

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/pnms', label: 'PNMs', icon: Users },
  { to: '/voting', label: 'Bid Room', icon: Vote },
  { to: '/texting', label: 'Texting', icon: MessageSquareText }
]

export function Navbar(): JSX.Element {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-3">
        {/* Crest + wordmark */}
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-3 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-gold-500/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 font-display text-lg font-bold text-ink-950 shadow-glow transition group-hover:from-gold-400 group-hover:to-gold-200">
            {BRAND.greek}
          </div>
          <div className="hidden text-left sm:block">
            <div className="text-sm font-bold leading-none text-ink-50">{BRAND.appName}</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-gold-500">
              {BRAND.tagline}
            </div>
          </div>
        </button>

        {/* Nav */}
        <nav className="ml-4 flex items-center gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none transition focus-visible:ring-1 focus-visible:ring-gold-500/40',
                  isActive
                    ? 'bg-garnet-600/20 text-gold-300 ring-1 ring-inset ring-gold-500/20'
                    : 'text-ink-200 hover:bg-white/5 hover:text-ink-50'
                )
              }
            >
              <l.icon size={16} />
              <span className="hidden md:inline">{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <UpdateButton compact />
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'rounded-lg p-2 outline-none transition focus-visible:ring-1 focus-visible:ring-gold-500/40',
                isActive ? 'bg-white/5 text-gold-300' : 'text-ink-200 hover:bg-white/5 hover:text-ink-50'
              )
            }
            title="Settings"
          >
            <Settings size={18} />
          </NavLink>

          <div className="flex items-center gap-2 rounded-lg border border-ink-700 py-1 pl-1 pr-2 transition hover:border-ink-700 hover:bg-white/5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-garnet-600 to-garnet-500 text-xs font-bold text-gold-100 ring-1 ring-white/10">
              {initials(user?.name?.split(' ')[0], user?.name?.split(' ')[1])}
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-xs font-semibold leading-none text-ink-50">{user?.name}</div>
              <div className="text-[10px] capitalize text-ink-400">{user?.role?.replace('_', ' ')}</div>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="ml-1 rounded p-0.5 text-ink-400 outline-none transition hover:text-garnet-300 focus-visible:ring-1 focus-visible:ring-garnet-400/50"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
