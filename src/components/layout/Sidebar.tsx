import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Clock, CalendarCheck,
  ClipboardList, Megaphone, Settings, ChevronLeft, Wallet, BarChart3,
  Building2, Activity, School
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  icon: React.ReactNode
  to: string
}

const superAdminNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/super-admin' },
  { label: 'Schools', icon: <Building2 size={18} />, to: '/super-admin/schools' },
  { label: 'Users', icon: <Users size={18} />, to: '/super-admin/users' },
  { label: 'Analytics', icon: <BarChart3 size={18} />, to: '/super-admin/analytics' },
  { label: 'Activity Logs', icon: <Activity size={18} />, to: '/super-admin/logs' },
  { label: 'Settings', icon: <Settings size={18} />, to: '/super-admin/settings' },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/admin' },
  { label: 'Students', icon: <GraduationCap size={18} />, to: '/admin/students' },
  { label: 'Staff', icon: <Users size={18} />, to: '/admin/staff' },
  { label: 'Classes', icon: <School size={18} />, to: '/admin/classes' },
  { label: 'Subjects', icon: <BookOpen size={18} />, to: '/admin/subjects' },
  { label: 'Timetable', icon: <Clock size={18} />, to: '/admin/timetable' },
  { label: 'Attendance', icon: <CalendarCheck size={18} />, to: '/admin/attendance' },
  { label: 'Exams & Marks', icon: <ClipboardList size={18} />, to: '/admin/exams' },
  { label: 'Announcements', icon: <Megaphone size={18} />, to: '/admin/announcements' },
  { label: 'Fees', icon: <Wallet size={18} />, to: '/admin/fees' },
  { label: 'Reports', icon: <BarChart3 size={18} />, to: '/admin/reports' },
  { label: 'Activity Logs', icon: <Activity size={18} />, to: '/admin/logs' },
  { label: 'Settings', icon: <Settings size={18} />, to: '/admin/settings' },
]

const staffNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/staff' },
  { label: 'My Students', icon: <GraduationCap size={18} />, to: '/staff/students' },
  { label: 'Attendance', icon: <CalendarCheck size={18} />, to: '/staff/attendance' },
  { label: 'Marks', icon: <ClipboardList size={18} />, to: '/staff/marks' },
  { label: 'Timetable', icon: <Clock size={18} />, to: '/staff/timetable' },
  { label: 'Announcements', icon: <Megaphone size={18} />, to: '/staff/announcements' },
]

const studentNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/student' },
  { label: 'My Attendance', icon: <CalendarCheck size={18} />, to: '/student/attendance' },
  { label: 'My Marks', icon: <ClipboardList size={18} />, to: '/student/marks' },
  { label: 'Timetable', icon: <Clock size={18} />, to: '/student/timetable' },
  { label: 'Announcements', icon: <Megaphone size={18} />, to: '/student/announcements' },
]

interface SidebarProps {
  collapsed: boolean
  onCollapse: (v: boolean) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const { role } = useAuth()
  const location = useLocation()

  const navItems =
    role === 'super_admin' ? superAdminNav :
    role === 'school_admin' ? adminNav :
    role === 'staff' ? staffNav :
    studentNav

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-card border-r border-border overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
          <span className="text-white font-bold text-sm">B</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="font-bold text-lg text-foreground tracking-tight"
            >
              Byte
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to + '/'))
          return (
            <NavLink key={item.to} to={item.to} end={item.to.split('/').length === 2}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 2 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className={cn('shrink-0', isActive && 'text-primary')}>{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="active-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse Button */}
      <button
        onClick={() => onCollapse(!collapsed)}
        className="absolute top-[72px] -right-3 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border shadow-sm hover:bg-muted transition-colors"
      >
        <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronLeft size={12} className="text-muted-foreground" />
        </motion.div>
      </button>
    </motion.aside>
  )
}
