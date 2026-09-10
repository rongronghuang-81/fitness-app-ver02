import {
  BookOpen,
  CalendarDays,
  Dumbbell,
  GraduationCap,
  Home,
  Layers,
  LayoutList,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

/** Desktop sidebar — the full planning surface (§5). */
export const DESKTOP_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/classes', label: 'Classes', icon: LayoutList },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/terms', label: 'Terms', icon: Layers },
  { href: '/tricks', label: 'Tricks', icon: Sparkles },
  { href: '/exercises', label: 'Exercises', icon: Dumbbell },
  { href: '/templates', label: 'Templates', icon: BookOpen },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
]

/** Mobile tab bar — the four things needed around a class, plus More (§5). */
export const MOBILE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/library', label: 'Library', icon: GraduationCap },
]

/** Everything reachable from the mobile "More" sheet. */
export const MORE_NAV: NavItem[] = [
  { href: '/classes', label: 'Classes', icon: LayoutList },
  { href: '/terms', label: 'Terms', icon: Layers },
  { href: '/tricks', label: 'Tricks', icon: Sparkles },
  { href: '/exercises', label: 'Exercises', icon: Dumbbell },
  { href: '/templates', label: 'Lesson templates', icon: BookOpen },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
]
