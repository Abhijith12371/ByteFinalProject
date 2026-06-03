import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Megaphone, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'

const announcementSchema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  target_audience: z.enum(['all', 'staff', 'students']).optional(),
  publish_date: z.string(),
  expiry_date: z.string().optional(),
})
type AnnouncementForm = z.infer<typeof announcementSchema>

const PRIORITY_COLORS: Record<string, string> = {
  low: 'muted', normal: 'secondary', high: 'warning', urgent: 'danger'
}

export const AnnouncementsPage: React.FC = () => {
  const { schoolId, profile } = useAuth()
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*, profile:profiles(full_name)')
        .eq('school_id', schoolId!)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      priority: 'normal',
      target_audience: 'all',
      publish_date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const onSubmit = async (data: any) => {
    await supabase.from('announcements').insert({
      ...data,
      school_id: schoolId!,
      created_by: profile!.id,
    })
    await qc.invalidateQueries({ queryKey: ['announcements'] })
    reset(); setAddOpen(false)
  }

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    qc.invalidateQueries({ queryKey: ['announcements'] })
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground text-sm">{announcements?.length ?? 0} announcements</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> New Announcement</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}

        {!isLoading && announcements?.length === 0 && (
          <Card>
            <div className="py-16 text-center space-y-3">
              <Megaphone size={40} className="mx-auto text-muted-foreground" />
              <h3 className="font-semibold text-foreground">No announcements yet</h3>
              <p className="text-muted-foreground text-sm">Create your first announcement to communicate with staff and students.</p>
              <Button onClick={() => setAddOpen(true)}><Plus size={16} /> New Announcement</Button>
            </div>
          </Card>
        )}

        {announcements?.map((ann: {
          id: string; title: string; description?: string; priority: string;
          target_audience: string; publish_date: string; expiry_date?: string;
          profile?: { full_name?: string }
        }) => (
          <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Megaphone size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground">{ann.title}</h3>
                        <Badge variant={(PRIORITY_COLORS[ann.priority] || 'muted') as 'muted' | 'secondary' | 'warning' | 'danger'}>
                          {ann.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{ann.target_audience}</Badge>
                      </div>
                      {ann.description && <p className="text-sm text-muted-foreground mb-2">{ann.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {format(new Date(ann.publish_date), 'MMM d, yyyy')}</span>
                        {ann.expiry_date && <span>· Expires {format(new Date(ann.expiry_date), 'MMM d, yyyy')}</span>}
                        <span>· by {ann.profile?.full_name ?? 'Admin'}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-danger shrink-0" onClick={() => deleteAnnouncement(ann.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="Announcement title..." {...register('title')} />
              {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Describe the announcement..." {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select defaultValue="normal" onValueChange={v => setValue('priority', v as 'low' | 'normal' | 'high' | 'urgent')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Audience</Label>
                <Select defaultValue="all" onValueChange={v => setValue('target_audience', v as 'all' | 'staff' | 'students')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="staff">Staff Only</SelectItem>
                    <SelectItem value="students">Students Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Publish Date</Label>
                <Input type="date" {...register('publish_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" {...register('expiry_date')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Publish</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
