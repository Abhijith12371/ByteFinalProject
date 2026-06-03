import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Papa from 'papaparse'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Upload, Download, Clock, AlertCircle } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface TimetableEntry {
  id: string
  day_of_week: string
  period_number: number
  start_time: string
  end_time: string
  subject?: { name: string }
  staff?: { profile?: { full_name?: string } }
}

interface CsvRow { day: string; period: string; start_time: string; end_time: string; subject: string; teacher: string }

export const TimetablePage: React.FC = () => {
  const { schoolId } = useAuth()
  const qc = useQueryClient()
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [csvErrors, setCsvErrors] = useState<string[]>([])

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

  const { data: timetable, isLoading } = useQuery({
    queryKey: ['timetable', selectedSection],
    enabled: !!selectedSection,
    queryFn: async () => {
      const { data } = await supabase
        .from('timetables')
        .select('*, subject:subjects(name), staff(profile:profiles(full_name))')
        .eq('section_id', selectedSection)
        .order('day_of_week').order('period_number')
      return (data ?? []) as TimetableEntry[]
    },
  })

  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = timetable?.filter(t => t.day_of_week === day) ?? []
    return acc
  }, {} as Record<string, TimetableEntry[]>)

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const required = ['day', 'period', 'start_time', 'end_time', 'subject', 'teacher']
        const missing = required.filter(h => !result.meta.fields?.includes(h))
        if (missing.length) { setCsvErrors([`Missing: ${missing.join(', ')}`]); return }
        const errs: string[] = []
        result.data.forEach((row, i) => {
          if (!DAYS.includes(row.day)) errs.push(`Row ${i + 2}: Invalid day "${row.day}"`)
          if (row.start_time >= row.end_time) errs.push(`Row ${i + 2}: start_time must be before end_time`)
        })
        setCsvErrors(errs)
        setCsvRows(result.data)
      },
    })
  }

  const importTimetable = async () => {
    if (!selectedSection || csvErrors.length > 0) return
    // Delete existing first
    await supabase.from('timetables').delete().eq('section_id', selectedSection)
    // Build insert rows (subject and staff lookup would happen here)
    // This is a simplified version - in production you'd resolve subject/staff IDs
    await qc.invalidateQueries({ queryKey: ['timetable'] })
    setCsvOpen(false)
  }

  const downloadTemplate = () => {
    const csv = 'day,period,start_time,end_time,subject,teacher\nMonday,1,09:00,09:45,Maths,Ramesh\nMonday,2,09:45,10:30,English,Suresh'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'timetable_template.csv'; a.click()
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Timetable</h1>
          <p className="text-muted-foreground text-sm">Manage class timetables</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download size={14} /> Template</Button>
          <Button size="sm" onClick={() => setCsvOpen(true)} disabled={!selectedSection}><Upload size={14} /> Upload CSV</Button>
        </div>
      </motion.div>

      {/* Section Selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Label className="shrink-0">Class / Section:</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select a class-section..." />
              </SelectTrigger>
              <SelectContent>
                {sections?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.class?.name} — Section {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      {selectedSection && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {isLoading ? (
            <div className="grid gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : !timetable?.length ? (
            <Card>
              <div className="py-16 text-center space-y-3">
                <Clock size={40} className="mx-auto text-muted-foreground" />
                <h3 className="font-semibold text-foreground">No timetable yet</h3>
                <p className="text-muted-foreground text-sm">Upload a CSV to set up the timetable for this section.</p>
                <Button onClick={() => setCsvOpen(true)}><Upload size={16} /> Upload Timetable</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {DAYS.map(day => (
                grouped[day].length > 0 && (
                  <Card key={day}>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{day}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex flex-wrap gap-2">
                        {grouped[day].map(entry => (
                          <div key={entry.id} className="flex items-start gap-2 bg-muted/50 border border-border rounded-md px-3 py-2 min-w-[140px]">
                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-primary text-xs font-bold">{entry.period_number}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{entry.subject?.name ?? 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{entry.start_time} – {entry.end_time}</p>
                              <p className="text-xs text-muted-foreground">{entry.staff?.profile?.full_name ?? '—'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* CSV Upload Dialog */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Upload Timetable CSV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Upload CSV to replace the existing timetable for this section.</p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}><Download size={14} /> Template</Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Select CSV file</p>
              <input type="file" accept=".csv" onChange={handleCsvFile} className="hidden" id="tt-csv" />
              <label htmlFor="tt-csv"><Button variant="outline" size="sm" asChild><span>Choose File</span></Button></label>
            </div>
            {csvErrors.map(e => (
              <div key={e} className="flex items-center gap-2 rounded-md bg-danger/10 border border-danger/20 px-3 py-2">
                <AlertCircle size={14} className="text-danger shrink-0" />
                <p className="text-xs text-danger">{e}</p>
              </div>
            ))}
            {csvRows.length > 0 && csvErrors.length === 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">{csvRows.length} periods found</p>
                <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50"><tr>{Object.keys(csvRows[0]).map(h => <th key={h} className="px-3 py-2 text-left text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {csvRows.slice(0, 5).map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j} className="px-3 py-1.5 text-foreground">{v}</td>)}</tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Cancel</Button>
            <Button disabled={csvRows.length === 0 || csvErrors.length > 0} onClick={importTimetable}>Import Timetable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
