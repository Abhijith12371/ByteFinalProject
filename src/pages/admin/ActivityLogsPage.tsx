import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export const ActivityLogsPage: React.FC = () => {
  const { schoolId, role } = useAuth()

  const { data: logs, isLoading } = useQuery({
    queryKey: ['activity-logs', schoolId],
    enabled: !!schoolId || role === 'super_admin',
    queryFn: async () => {
      let q = supabase
        .from('activity_logs')
        .select('*, profile:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (role !== 'super_admin' && schoolId) {
        q = q.eq('school_id', schoolId)
      }
      
      const { data } = await q
      return data ?? []
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !logs?.length ? (
            <div className="py-12 text-center text-muted-foreground">No activity recorded yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log: { id: string; action: string; entity: string; created_at: string; profile?: { full_name?: string } }) => (
                <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock size={14} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.profile?.full_name ?? 'System'} · {log.entity}</p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{new Date(log.created_at).toLocaleDateString()}</p>
                    <p>{new Date(log.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
