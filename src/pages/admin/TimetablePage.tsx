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
  const [importing, setImporting] = useState(false)
  const [importLog, setImportLog] = useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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
    setImportLog([])
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const required = ['day', 'period', 'start_time', 'end_time', 'subject', 'teacher']
        const missing = required.filter(h => !result.meta.fields?.includes(h))
        if (missing.length) { setCsvErrors([`Missing columns: ${missing.join(', ')}`]); return }
        const errs: string[] = []
        result.data.forEach((row, i) => {
          if (!DAYS.includes(row.day)) errs.push(`Row ${i + 2}: Invalid day "${row.day}" — must be Monday-Saturday`)
          if (row.start_time >= row.end_time) errs.push(`Row ${i + 2}: start_time must be before end_time`)
        })
        setCsvErrors(errs)
        setCsvRows(result.data)
      },
    })
  }

  const importTimetable = async () => {
    if (!selectedSection || csvErrors.length > 0) return
    setImporting(true)
    setImportLog([])
    const log: string[] = []

    // 1. Fetch all subjects and staff for this school to resolve names → IDs
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('school_id', schoolId!)

    const { data: staffProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('school_id', schoolId!)
      .eq('role', 'staff')

    const subjectMap = Object.fromEntries((subjects ?? []).map(s => [s.name.toLowerCase().trim(), s.id]))
    const staffMap = Object.fromEntries((staffProfiles ?? []).map(s => [s.full_name?.toLowerCase().trim() ?? '', s.id]))

    // 2. Delete existing timetable for this section
    await supabase.from('timetables').delete().eq('section_id', selectedSection)

    // 3. Insert each row
    let successCount = 0
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i]
      const subjectId = subjectMap[row.subject.toLowerCase().trim()]
      const staffId = staffMap[row.teacher.toLowerCase().trim()]

      if (!subjectId) {
        log.push(`SKIP Row ${i + 1}: Subject "${row.subject}" not found in DB — add it to Subjects first`)
        continue
      }

      const { error } = await supabase.from('timetables').insert({
        section_id: selectedSection,
        day_of_week: row.day,
        period_number: Number(row.period),
        start_time: row.start_time,
        end_time: row.end_time,
        subject_id: subjectId,
        staff_id: staffId ?? null,
      } as any)

      if (error) {
        log.push(`FAIL Row ${i + 1} (${row.day} P${row.period}): ${error.message}`)
      } else {
        successCount++
        log.push(`OK Row ${i + 1} (${row.day} P${row.period} - ${row.subject}): Added`)
        if (!staffId) log.push(`  NOTE: Teacher "${row.teacher}" not found — period saved without staff assignment`)
      }
    }

    log.unshift(`Import complete: ${successCount}/${csvRows.length} periods added`)
    setImportLog(log)
    setImporting(false)
    await qc.invalidateQueries({ queryKey: ['timetable'] })
  }

  const downloadTemplate = () => {
    const csv = 'day,period,start_time,end_time,subject,teacher\nMonday,1,09:00,09:45,Maths,Ramesh Kumar\nMonday,2,09:45,10:30,English,Suresh Babu\nTuesday,1,09:00,09:45,Science,Ramesh Kumar'
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
              <p className="text-sm text-muted-foreground">Replaces existing timetable for this section.</p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}><Download size={14} /> Template</Button>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">Click to select or drag CSV file here</p>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvFile} className="hidden" />
              <Button variant="outline" size="sm" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                Choose File
              </Button>
            </div>

            {csvErrors.map(e => (
              <div key={e} className="flex items-center gap-2 rounded-md bg-red-100 border border-red-300 px-3 py-2">
                <AlertCircle size={14} className="text-red-600 shrink-0" />
                <p className="text-xs text-red-700">{e}</p>
              </div>
            ))}

            {csvRows.length > 0 && csvErrors.length === 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">{csvRows.length} periods found — Preview:</p>
                <div className="border border-border rounded overflow-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>{Object.keys(csvRows[0]).map(h => <th key={h} className="px-3 py-2 text-left text-muted-foreground">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {csvRows.slice(0, 5).map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j} className="px-3 py-1.5 text-foreground">{v}</td>)}</tr>)}
                    </tbody>
                  </table>
                </div>
                {csvRows.length > 5 && <p className="text-xs text-muted-foreground mt-1">...and {csvRows.length - 5} more rows</p>}
              </div>
            )}

            {importLog.length > 0 && (
              <div className="rounded-md border border-border max-h-36 overflow-y-auto p-2 space-y-1 bg-muted/30">
                {importLog.map((line, i) => <p key={i} className="text-xs font-mono">{line}</p>)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Cancel</Button>
            <Button
              disabled={csvRows.length === 0 || csvErrors.length > 0 || importing}
              onClick={importTimetable}
            >
              {importing ? 'Importing...' : `Import ${csvRows.length} Periods`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
