import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarCheck, CheckCircle, XCircle, Clock, AlertCircle, Save } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type AttStatus = 'present' | 'absent' | 'late' | 'half_day'

const STATUS_CONFIG: Record<AttStatus, { label: string; color: string; icon: React.ReactNode }> = {
  present:  { label: 'P', color: 'bg-success/15 text-success border-success/30 hover:bg-success/25', icon: <CheckCircle size={14} /> },
  absent:   { label: 'A', color: 'bg-danger/15 text-danger border-danger/30 hover:bg-danger/25', icon: <XCircle size={14} /> },
  late:     { label: 'L', color: 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/25', icon: <Clock size={14} /> },
  half_day: { label: 'H', color: 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/25', icon: <AlertCircle size={14} /> },
}

export const AttendancePage: React.FC = () => {
  const { schoolId, profile } = useAuth()
  const qc = useQueryClient()
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({})
  const [saving, setSaving] = useState(false)

  const { data: sections } = useQuery({
    queryKey: ['sections-select', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase
        .from('sections')
        .select('id, name, class:classes!inner(name, school_id)')
        .eq('class.school_id', schoolId!)
      return (data ?? []) as Array<{ id: string; name: string; class?: { name: string } }>
    },
  })

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-attendance', selectedSection],
    enabled: !!selectedSection,
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, roll_number, profile:profiles(full_name)')
        .eq('section_id', selectedSection)
        .order('roll_number')
      return data ?? []
    },
  })

  useQuery({
    queryKey: ['attendance', selectedSection, selectedDate],
    enabled: !!selectedSection && !!selectedDate,
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('section_id', selectedSection)
        .eq('date', selectedDate)
      const map: Record<string, AttStatus> = {}
      ;(data as any[])?.forEach(r => { map[r.student_id] = r.status as AttStatus })
      setAttendance(map)
      return map
    },
  })

  const markAll = (status: AttStatus) => {
    const map: Record<string, AttStatus> = {}
    students?.forEach((s: { id: string }) => { map[s.id] = status })
    setAttendance(map)
  }

  const saveAttendance = async () => {
    if (!selectedSection || !profile) return
    setSaving(true)
    const rows = Object.entries(attendance).map(([student_id, status]) => ({
      student_id,
      section_id: selectedSection,
      date: selectedDate,
      status,
      marked_by: profile.id,
    }))
    // @ts-expect-error upsert typing issues with generic supabase config
    await supabase.from('attendance').upsert(rows as any[], { onConflict: 'student_id,date' })
    await qc.invalidateQueries({ queryKey: ['attendance'] })
    setSaving(false)
  }

  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const totalStudents = students?.length ?? 0
  const attendancePct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground text-sm">Mark and track daily attendance</p>
        </div>
        <Button onClick={saveAttendance} disabled={!selectedSection || totalStudents === 0} isLoading={saving}>
          <Save size={14} /> Save Attendance
        </Button>
      </motion.div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Section:</span>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select section..." /></SelectTrigger>
                <SelectContent>
                  {sections?.map(s => <SelectItem key={s.id} value={s.id}>{s.class?.name} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {selectedSection && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-sm text-muted-foreground mr-2">Mark all:</span>
                {(Object.keys(STATUS_CONFIG) as AttStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => markAll(s)}
                    className={cn('px-2.5 py-1 rounded border text-xs font-medium transition-colors', STATUS_CONFIG[s].color)}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedSection && totalStudents > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Present', count: Object.values(attendance).filter(s => s === 'present').length, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Absent', count: Object.values(attendance).filter(s => s === 'absent').length, color: 'text-danger', bg: 'bg-danger/10' },
            { label: 'Late', count: Object.values(attendance).filter(s => s === 'late').length, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Percentage', count: `${attendancePct}%`, color: 'text-primary', bg: 'bg-primary/10' },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bg)}>
                  <CalendarCheck size={18} className={stat.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student List */}
      {selectedSection && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-semibold">
                {studentsLoading ? 'Loading...' : `${totalStudents} Students`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              {studentsLoading ? (
                <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />)}</div>
              ) : totalStudents === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No students in this section</div>
              ) : (
                <div className="divide-y divide-border">
                  {(students as Array<{ id: string; roll_number: string; profile?: { full_name?: string } }>).map((student) => {
                    const currentStatus = attendance[student.id]
                    return (
                      <div key={student.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary text-xs font-semibold">{(student.profile?.full_name ?? 'S').charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{student.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">Roll: {student.roll_number}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {(Object.keys(STATUS_CONFIG) as AttStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => setAttendance(prev => ({ ...prev, [student.id]: s }))}
                              className={cn(
                                'w-9 h-9 rounded-md border text-xs font-bold transition-all',
                                currentStatus === s ? STATUS_CONFIG[s].color : 'border-border text-muted-foreground hover:bg-muted'
                              )}
                              title={s.replace('_', ' ')}
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
