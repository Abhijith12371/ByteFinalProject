import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Edit, Trash2, Users, X } from 'lucide-react'

const staffSchema = z.object({
  full_name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  mobile_number: z.string().min(10, 'Mobile required'),
  staff_id: z.string().min(1, 'Staff ID required'),
  designation: z.string().optional(),
  qualification: z.string().optional(),
  experience_years: z.string().optional(),
})
type StaffForm = z.infer<typeof staffSchema>

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="py-16 flex flex-col items-center gap-3 text-center">
    <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
      <Users size={28} className="text-secondary" />
    </div>
    <h3 className="text-lg font-semibold text-foreground">No staff members yet</h3>
    <p className="text-muted-foreground text-sm max-w-xs">Add your first staff member to get started.</p>
    <Button onClick={onAdd}><Plus size={16} /> Add Staff</Button>
  </div>
)

const StaffDialog: React.FC<{ open: boolean; onClose: () => void; schoolId: string }> = ({ open, onClose, schoolId }) => {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
  })

  React.useEffect(() => { if (!open) reset() }, [open, reset])

  const onSubmit = async (data: StaffForm) => {
    if (!schoolId) {
      alert("Error: Your admin account is not linked to a school. Please register a new school.")
      return
    }
    // Create a temporary client that DOES NOT persist the session,
    // so the admin does not get logged out and replaced by the staff member.
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    )

    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: data.email,
      password: 'StaffTemp@123',
      options: {
        data: { full_name: data.full_name, role: 'staff', school_id: schoolId, mobile_number: data.mobile_number }
      }
    })
    
    if (authError) {
      alert("Auth Error: " + authError.message)
      return
    }

    if (authData?.user) {
      const { error: insertError } = await supabase.from('staff').insert({
        id: authData.user.id,
        school_id: schoolId,
        staff_id: data.staff_id,
        designation: data.designation,
        qualification: data.qualification,
        experience_years: data.experience_years ? Number(data.experience_years) : null,
      } as any)
      
      if (insertError) {
        alert("Database Error: " + insertError.message + "\nDetails: " + insertError.details + "\nHint: " + insertError.hint)
        console.error("STAFF INSERT ERROR", insertError)
      }
    }
    await qc.invalidateQueries({ queryKey: ['staff'] })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="Dr. Ramesh Kumar" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="staff@school.com" {...register('email')} />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile *</Label>
              <Input placeholder="9876543210" {...register('mobile_number')} />
              {errors.mobile_number && <p className="text-xs text-danger">{errors.mobile_number.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Staff ID *</Label>
              <Input placeholder="STF001" {...register('staff_id')} />
              {errors.staff_id && <p className="text-xs text-danger">{errors.staff_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Input placeholder="Senior Teacher" {...register('designation')} />
            </div>
            <div className="space-y-1.5">
              <Label>Qualification</Label>
              <Input placeholder="M.Sc, B.Ed" {...register('qualification')} />
            </div>
            <div className="space-y-1.5">
              <Label>Experience (Years)</Label>
              <Input type="number" placeholder="5" {...register('experience_years')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Add Staff</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const StaffPage: React.FC = () => {
  const { schoolId } = useAuth()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const qc = useQueryClient()

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', schoolId, search],
    enabled: !!schoolId,
    queryFn: async () => {
      let q = supabase
        .from('staff')
        .select('*, profile:profiles!inner(full_name, school_id)')
        .eq('profile.school_id', schoolId!)
      if (search) q = q.ilike('profile.full_name', `%${search}%`)
      const { data } = await q
      return data ?? []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('profiles').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground text-sm">{staff?.length ?? 0} staff members</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Staff</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search staff..." className="pl-8 h-8" value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={14} /></button>}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />)}</div>
          ) : staff?.length === 0 ? (
            <EmptyState onAdd={() => setAddOpen(true)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Designation</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Experience</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staff?.map((s: { id: string; staff_id: string; designation?: string | null; experience_years?: number | null; profile?: { full_name?: string; email?: string; mobile_number?: string } }) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                            <span className="text-secondary text-xs font-semibold">{(s.profile?.full_name ?? 'S').charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{s.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.staff_id}</td>
                      <td className="px-4 py-3"><Badge variant="muted">{s.designation ?? '—'}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{s.experience_years ? `${s.experience_years} yrs` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Edit size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-danger" onClick={() => { if (confirm('Delete this staff member?')) deleteMutation.mutate(s.id) }}><Trash2 size={13} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      <StaffDialog open={addOpen} onClose={() => setAddOpen(false)} schoolId={schoolId ?? ''} />
    </div>
  )
}
