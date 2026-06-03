import React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, CalendarCheck, ClipboardList, Clock, ArrowRight } from 'lucide-react'

export const StaffDashboard: React.FC = () => {
  const { profile, schoolId } = useAuth()
  const navigate = useNavigate()

  const { data: assignments } = useQuery({
    queryKey: ['staff-assignments', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_assignments')
        .select('*, section:sections(name, class:classes(name)), subject:subjects(name)')
        .eq('staff_id', profile!.id)
      return data ?? []
    },
  })

  const { data: announcements } = useQuery({
    queryKey: ['announcements-staff', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId!)
        .in('target_audience', ['all', 'staff'])
        .order('created_at', { ascending: false })
        .limit(5)
      return data ?? []
    },
  })

  const uniqueClasses = new Set(assignments?.map((a: { section?: { class?: { name?: string } } }) => a.section?.class?.name)).size
  const uniqueSubjects = new Set(assignments?.map((a: { subject?: { name?: string } }) => a.subject?.name)).size

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back, {profile?.full_name} 👋</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Classes', value: uniqueClasses, icon: <GraduationCap size={20} className="text-primary" />, bg: 'bg-primary/10' },
          { label: 'Subjects', value: uniqueSubjects, icon: <ClipboardList size={20} className="text-secondary" />, bg: 'bg-secondary/10' },
          { label: 'Total Assignments', value: assignments?.length ?? 0, icon: <Clock size={20} className="text-accent" />, bg: 'bg-accent/10' },
          { label: 'Announcements', value: announcements?.length ?? 0, icon: <CalendarCheck size={20} className="text-success" />, bg: 'bg-success/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/staff/attendance')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Mark Attendance</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Record today's attendance</p>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <CalendarCheck size={20} />
              <ArrowRight size={16} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-secondary/20 hover:border-secondary/40 transition-colors cursor-pointer" onClick={() => navigate('/staff/marks')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Upload Marks</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Enter exam marks for students</p>
            </div>
            <div className="flex items-center gap-2 text-secondary">
              <ClipboardList size={20} />
              <ArrowRight size={16} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Assignments */}
      <Card>
        <CardHeader><CardTitle className="text-base font-semibold">My Class Assignments</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!assignments?.length ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No assignments yet</div>
          ) : (
            <div className="divide-y divide-border">
              {assignments.map((a: { id: string; section?: { name?: string; class?: { name?: string } }; subject?: { name?: string }; is_class_teacher?: boolean }) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardList size={14} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{a.subject?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{a.section?.class?.name} — Section {a.section?.name}</p>
                  </div>
                  {a.is_class_teacher && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Class Teacher</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
