import React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarCheck, ClipboardList, Megaphone, Clock } from 'lucide-react'

export const StudentDashboard: React.FC = () => {
  const { profile, schoolId } = useAuth()

  // Simplified queries for demonstration
  const { data: studentInfo } = useQuery({
    queryKey: ['student-info', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('*, section:sections(name, class:classes(name))')
        .eq('id', profile!.id)
        .single()
      return data
    },
  })

  const { data: announcements } = useQuery({
    queryKey: ['announcements-student', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId!)
        .in('target_audience', ['all', 'students'])
        .order('created_at', { ascending: false })
        .limit(5)
      return data ?? []
    },
  })

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back, {profile?.full_name} 👋</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-2xl font-bold">{(profile?.full_name ?? 'S').charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>
                  <p className="text-sm text-muted-foreground">Roll No: {(studentInfo as any)?.roll_number ?? '—'}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {(studentInfo as any)?.section?.class?.name ?? '—'} — Section {(studentInfo as any)?.section?.name ?? '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-success/20">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Attendance</p>
                  <p className="text-3xl font-bold text-foreground">94%</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10 text-success"><CalendarCheck size={24} /></div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Last Exam Avg</p>
                  <p className="text-3xl font-bold text-foreground">82%</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 text-primary"><ClipboardList size={24} /></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><Clock size={16} className="text-muted-foreground"/> Today's Timetable</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="py-8 text-center text-muted-foreground text-sm">Timetable will appear here</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><Megaphone size={16} className="text-muted-foreground"/> Notice Board</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!announcements?.length ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No new announcements</div>
              ) : (
                <div className="divide-y divide-border">
                  {announcements.map((a: { id: string; title: string; created_at: string }) => (
                    <div key={a.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                      <p className="text-sm font-medium text-foreground line-clamp-2 mb-1">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
