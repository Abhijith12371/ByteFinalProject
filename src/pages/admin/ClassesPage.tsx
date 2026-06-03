import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, School, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

const classSchema = z.object({ name: z.string().min(1, 'Class name required'), level: z.string().optional() })
const sectionSchema = z.object({ name: z.string().min(1, 'Section name required') })
type ClassForm = z.infer<typeof classSchema>
type SectionForm = z.infer<typeof sectionSchema>

export const ClassesPage: React.FC = () => {
  const { schoolId } = useAuth()
  const qc = useQueryClient()
  const [addClassOpen, setAddClassOpen] = useState(false)
  const [addSectionFor, setAddSectionFor] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data: acYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('school_id', schoolId!)
        .eq('is_current', true)
        .single() as any
      if (!acYear) return []
      const { data } = await supabase
        .from('classes')
        .select('*, sections(id, name)')
        .eq('school_id', schoolId!)
        .eq('academic_year_id', acYear.id)
        .order('level', { ascending: true })
      return data ?? []
    },
  })

  const { register: rcls, handleSubmit: hcls, reset: resetCls, formState: { errors: eCls, isSubmitting: sCls } } = useForm<ClassForm>({ resolver: zodResolver(classSchema) })
  const { register: rsec, handleSubmit: hsec, reset: resetSec, formState: { errors: eSec, isSubmitting: sSec } } = useForm<SectionForm>({ resolver: zodResolver(sectionSchema) })

  const addClass = async (data: any) => {
    const { data: acYear } = await supabase.from('academic_years').select('id').eq('school_id', schoolId!).eq('is_current', true).single() as any
    if (!acYear) return
    await supabase.from('classes').insert({ ...data, level: data.level ? Number(data.level) : null, school_id: schoolId!, academic_year_id: acYear.id } as any)
    await qc.invalidateQueries({ queryKey: ['classes'] })
    resetCls(); setAddClassOpen(false)
  }

  const addSection = async (data: any) => {
    if (!addSectionFor) return
    await supabase.from('sections').insert({ name: data.name, class_id: addSectionFor } as any)
    await qc.invalidateQueries({ queryKey: ['classes'] })
    resetSec(); setAddSectionFor(null)
  }

  const deleteClass = async (id: string) => {
    if (!confirm('Delete this class and all its sections?')) return
    await supabase.from('classes').delete().eq('id', id)
    qc.invalidateQueries({ queryKey: ['classes'] })
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Classes & Sections</h1>
          <p className="text-muted-foreground text-sm">{classes?.length ?? 0} classes configured</p>
        </div>
        <button onClick={() => setAddClassOpen(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"><Plus size={14} className="mr-2" /> Add Class</button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}

        {!isLoading && classes?.length === 0 && (
          <div className="rounded-lg border border-border bg-card">
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <School size={28} className="text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No classes yet</h3>
              <p className="text-muted-foreground text-sm">Add classes to start organizing your school structure.</p>
              <button onClick={() => setAddClassOpen(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 mt-2"><Plus size={16} className="mr-2" /> Add Class</button>
            </div>
          </div>
        )}

        {classes?.map((cls: { id: string; name: string; level?: number; sections?: { id: string; name: string }[] }) => (
          <div key={cls.id} className="rounded-lg border border-border bg-card overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleExpand(cls.id)}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <School size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{cls.name}</p>
                <p className="text-xs text-muted-foreground">{cls.sections?.length ?? 0} sections</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors hover:bg-muted hover:text-foreground h-7 px-2" onClick={(e) => { e.stopPropagation(); setAddSectionFor(cls.id) }}>
                  <Plus size={12} className="mr-1" /> Section
                </button>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted text-danger h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteClass(cls.id) }}>
                  <Trash2 size={13} />
                </button>
                {expanded.has(cls.id) ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
              </div>
            </div>

            {expanded.has(cls.id) && cls.sections && (
              <div className="border-t border-border px-4 py-3 bg-muted/20">
                <div className="flex flex-wrap gap-2">
                  {cls.sections.map((sec: { id: string; name: string }) => (
                    <div key={sec.id} className="flex items-center gap-1.5 bg-background border border-border rounded-md px-3 py-1.5">
                      <span className="text-sm font-medium text-foreground">Section {sec.name}</span>
                      <button
                        onClick={() => { if (confirm('Delete section?')) supabase.from('sections').delete().eq('id', sec.id).then(() => qc.invalidateQueries({ queryKey: ['classes'] })) }}
                        className="text-muted-foreground hover:text-danger ml-1 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {cls.sections.length === 0 && (
                    <p className="text-sm text-muted-foreground">No sections. Add one.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </motion.div>

      <Dialog open={addClassOpen} onOpenChange={setAddClassOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Class</DialogTitle></DialogHeader>
          <form onSubmit={hcls(addClass)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Class Name *</label>
              <input className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. Class 10" {...rcls('name')} />
              {eCls.name && <p className="text-xs text-danger">{eCls.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Level (for ordering)</label>
              <input type="number" className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="10" {...rcls('level')} />
            </div>
            <DialogFooter>
              <button type="button" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted border border-border h-9 px-4 py-2" onClick={() => setAddClassOpen(false)}>Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2" disabled={sCls}>Add Class</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addSectionFor} onOpenChange={() => setAddSectionFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Section</DialogTitle></DialogHeader>
          <form onSubmit={hsec(addSection)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Section Name *</label>
              <input className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. A" {...rsec('name')} />
              {eSec.name && <p className="text-xs text-danger">{eSec.name.message}</p>}
            </div>
            <DialogFooter>
              <button type="button" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted border border-border h-9 px-4 py-2" onClick={() => setAddSectionFor(null)}>Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2" disabled={sSec}>Add Section</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
