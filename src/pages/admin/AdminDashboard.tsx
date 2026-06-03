import React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Users, School, CalendarCheck, TrendingUp, ArrowUpRight, Clock } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const attendanceTrend = [
  { day: 'Mon', present: 92 }, { day: 'Tue', present: 88 }, { day: 'Wed', present: 95 },
  { day: 'Thu', present: 90 }, { day: 'Fri', present: 85 }, { day: 'Sat', present: 78 },
]
const performanceData = [
  { subject: 'Maths', avg: 74 }, { subject: 'English', avg: 82 }, { subject: 'Science', avg: 68 },
  { subject: 'History', avg: 79 }, { subject: 'PE', avg: 91 },
]

interface StatCardProps { title: string; value: string | number; change?: string; icon: React.ReactNode; color: string; delay?: number }
const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {change && <p className="text-xs text-success flex items-center gap-1 mt-1"><ArrowUpRight size={12} />{change}</p>}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

export const AdminDashboard: React.FC = () => {
  const { profile, schoolId } = useAuth()

  const { data: stats } = useQuery({
    queryKey: ['admin-stats', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [studentsRes, staffRes, classesRes, sectionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId!).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId!).eq('role', 'staff'),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', schoolId!),
        supabase.from('sections').select('id', { count: 'exact', head: true }),
      ])
      return {
        students: studentsRes.count ?? 0,
        staff: staffRes.count ?? 0,
        classes: classesRes.count ?? 0,
        sections: sectionsRes.count ?? 0,
      }
    },
  })

  const { data: recentLogs } = useQuery({
    queryKey: ['admin-activity', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*, profile:profiles(full_name)')
        .eq('school_id', schoolId!)
        .order('created_at', { ascending: false })
        .limit(8)
      return data ?? []
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground">School Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Welcome back, {profile?.full_name} 👋</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats?.students ?? '—'} change="+3 this week" icon={<GraduationCap size={20} className="text-primary" />} color="bg-primary/10" delay={0.1} />
        <StatCard title="Total Staff" value={stats?.staff ?? '—'} icon={<Users size={20} className="text-secondary" />} color="bg-secondary/10" delay={0.2} />
        <StatCard title="Classes" value={stats?.classes ?? '—'} icon={<School size={20} className="text-accent" />} color="bg-accent/10" delay={0.3} />
        <StatCard title="Avg. Attendance" value="91%" change="+2% vs last week" icon={<CalendarCheck size={20} className="text-success" />} color="bg-success/10" delay={0.4} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Attendance Trend (This Week)</CardTitle>
                <TrendingUp size={16} className="text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={attendanceTrend}>
                  <defs>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="present" stroke="#4F46E5" strokeWidth={2} fill="url(#attGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Average Marks by Subject</CardTitle>
                <TrendingUp size={16} className="text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={performanceData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="avg" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(!recentLogs || recentLogs.length === 0) ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No activity yet</div>
            ) : (
              <div className="divide-y divide-border">
                {recentLogs.map((log: { id: string; action: string; entity: string; created_at: string; profile?: { full_name?: string } }) => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.profile?.full_name ?? 'System'} · {log.entity}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
