import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { AlertCircle, CheckCircle, Clock, FileWarning } from 'lucide-react'

export default function Accountabilities(){
  const { user } = useAuth()
  const [rows, setRows] = React.useState<any[]>([])
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'resolved'>('all')

  React.useEffect(()=>{
    if(!user) return
    const processSnapshot = (snap: any) => {
      console.info('Accountabilities snapshot count:', snap.size)
      const list: any[] = []
      snap.forEach((d: any) => {
        const data: any = d.data()
        const due = data.dueDate?.toDate ? data.dueDate.toDate().toLocaleDateString() : (data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '')
        list.push({ id: d.id, due, details: data.details || '', status: data.status || 'pending' })
      })
      setRows(list)
    }

    let unsubMain: (() => void) | null = null
    let unsubFallback: (() => void) | null = null
    try {
      const q = query(collection(db,'accountabilities'), where('createdBy','==', user.uid), orderBy('dueDate','asc'))
      unsubMain = onSnapshot(q, (snap) => processSnapshot(snap), (err) => {
        console.error('Accountabilities snapshot error', err)
        try {
          const qf = query(collection(db,'accountabilities'), where('createdBy','==', user.uid))
          unsubFallback = onSnapshot(qf, (snap) => processSnapshot(snap), (err2) => console.error('Accountabilities fallback error', err2))
        } catch (e) {
          console.error('Failed to subscribe accountabilities fallback', e)
        }
      })
    } catch (e) {
      console.error('Failed to subscribe accountabilities main', e)
      const qf = query(collection(db,'accountabilities'), where('createdBy','==', user.uid))
      unsubFallback = onSnapshot(qf, (snap) => processSnapshot(snap), (err2) => console.error('Accountabilities fallback error', err2))
    }

    return () => { if (unsubMain) unsubMain(); if (unsubFallback) unsubFallback() }
  },[user])

  // Filter rows
  const filteredRows = rows.filter(r => {
    if (filter === 'all') return true
    return r.status?.toLowerCase() === filter
  })

  // Count stats
  const pendingCount = rows.filter(r => r.status?.toLowerCase() === 'pending').length
  const resolvedCount = rows.filter(r => r.status?.toLowerCase() === 'resolved').length

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase()
    if (s === 'resolved' || s === 'completed') {
      return <span className="badge badge-success gap-1"><CheckCircle className="w-3 h-3" />Resolved</span>
    }
    if (s === 'pending') {
      return <span className="badge badge-warning gap-1"><Clock className="w-3 h-3" />Pending</span>
    }
    if (s === 'overdue') {
      return <span className="badge badge-error gap-1"><AlertCircle className="w-3 h-3" />Overdue</span>
    }
    return <span className="badge badge-ghost">{status}</span>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileWarning className="w-6 h-6" />
          Accountabilities
        </h1>
        <p className="text-base-content/70">Track your pending items and obligations</p>
      </div>

      {/* Stats */}
      <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-200 w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <FileWarning className="w-8 h-8" />
          </div>
          <div className="stat-title">Total</div>
          <div className="stat-value">{rows.length}</div>
          <div className="stat-desc">All accountabilities</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-warning">
            <Clock className="w-8 h-8" />
          </div>
          <div className="stat-title">Pending</div>
          <div className="stat-value text-warning">{pendingCount}</div>
          <div className="stat-desc">Needs attention</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="stat-title">Resolved</div>
          <div className="stat-value text-success">{resolvedCount}</div>
          <div className="stat-desc">Completed</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-0">
          {/* Filter Tabs */}
          <div className="p-4 border-b border-base-300">
            <div role="tablist" className="tabs tabs-boxed bg-base-300 w-fit">
              <a 
                role="tab" 
                className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({rows.length})
              </a>
              <a 
                role="tab" 
                className={`tab ${filter === 'pending' ? 'tab-active' : ''}`}
                onClick={() => setFilter('pending')}
              >
                Pending ({pendingCount})
              </a>
              <a 
                role="tab" 
                className={`tab ${filter === 'resolved' ? 'tab-active' : ''}`}
                onClick={() => setFilter('resolved')}
              >
                Resolved ({resolvedCount})
              </a>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date Due</th>
                  <th>Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-base-content/60">
                        <CheckCircle className="w-12 h-12 opacity-30" />
                        <p className="font-medium">No accountabilities found</p>
                        <p className="text-sm">
                          {filter === 'all' 
                            ? "You're all clear!" 
                            : `No ${filter} items`}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(r => (
                    <tr key={r.id} className="hover">
                      <td>
                        <div className="font-medium">{r.due || 'No date set'}</div>
                      </td>
                      <td>
                        <div className="max-w-md">
                          <p className="text-sm">{r.details || 'No details provided'}</p>
                        </div>
                      </td>
                      <td>{getStatusBadge(r.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      {pendingCount > 0 && (
        <div className="alert alert-warning">
          <AlertCircle className="w-5 h-5" />
          <div>
            <h3 className="font-bold">Attention Required</h3>
            <div className="text-xs">You have {pendingCount} pending {pendingCount === 1 ? 'accountability' : 'accountabilities'} that need to be resolved.</div>
          </div>
        </div>
      )}
    </div>
  )
}
