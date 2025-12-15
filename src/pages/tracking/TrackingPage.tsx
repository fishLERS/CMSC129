import React from 'react'
import Sidebar from '../../sidebar'
import '/src/index.css'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../firebase'
import { isOngoing } from "../../utils/requestTime"
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { MapPin, Clock, CheckCircle, XCircle, AlertCircle, FileText, X, Eye, Copy, RotateCcw } from 'lucide-react'

export default function TrackingPage(){
  const { user } = useAuth()
  const [rows, setRows] = React.useState<Array<any>>([])
  const [filter, setFilter] = React.useState<'all' | 'pending'| 'ongoing' | 'completed' | 'approved' | 'declined'>('all')
  
  const [showRemarksOpen, setShowRemarksOpen] = React.useState(false)
  const [showRemarksText, setShowRemarksText] = React.useState('')
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  React.useEffect(()=>{
    if(!user) return
    console.info('Tracking mounted for user', user.uid)
  // order by client timestamp to avoid missing docs while serverTimestamp resolves
  const q = query(collection(db,'requests'), where('createdBy','==', user.uid), orderBy('createdAtClient','desc'))
    // Helper to process a snapshot into aggregated rows (safe for missing timestamps)
    const processSnapshot = (snap: any) => {
      const docs: any[] = []
      snap.forEach((doc: any) => {
        const data: any = doc.data()
        const requestId = doc.id
        const purpose = data.purpose || ''
        const status = data.status || ''
  // prefer admin-provided declinedRemarks, then generic remarks, then purpose as fallback
  const remarks = data.declinedRemarks || data.remarks || ''
        // compute human-friendly duration string from start/end fields if available
        let duration = ''
        try {
          const sDate = data.startDate || ''
          const sTime = data.start || ''
          const eDate = data.endDate || ''
          const eTime = data.end || ''
          if (sDate || eDate) {
            const startIso = (sDate ? sDate : eDate) + (sTime ? `T${sTime}` : 'T00:00')
            const endIso = (eDate ? eDate : sDate) + (eTime ? `T${eTime}` : 'T23:59')
            const sd = new Date(startIso)
            const ed = new Date(endIso)
            if (!isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
              const diffMs = Math.max(0, ed.getTime() - sd.getTime())
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60)) % 24
              const parts: string[] = []
              if (diffDays > 0) parts.push(`${diffDays}d`)
              if (diffHours > 0) parts.push(`${diffHours}h`)
              duration = `${sd.toLocaleString()} → ${ed.toLocaleString()}${parts.length ? ` (${parts.join(' ')})` : ''}`
            }
          }
        } catch (e) {
          duration = ''
        }
        // compute a sortable key (prefer client ISO timestamp, fallback to server timestamp)
        let sortKey = ''
        if (data && data.createdAtClient) sortKey = data.createdAtClient
        else if (data && data.createdAt && typeof data.createdAt.toDate === 'function') sortKey = data.createdAt.toDate().toISOString()
        else if (data && data.createdAt) {
          try { sortKey = new Date(data.createdAt).toISOString() } catch { sortKey = '' }
        }
        docs.push({ purpose, requestId, status, remarks, sortKey, startDate: data.startDate, start: data.start, endDate: data.endDate, end: data.end,duration })
      })
      // sort by sortKey desc (newest first); if no keys present, keep server ordering
      docs.sort((a,b) => (b.sortKey || '').localeCompare(a.sortKey || ''))
      setRows(docs)
    }

    // subscribe to ordered query first; if it errors (indexing / missing field), fall back to unordered subscription
    let unsubMain: (() => void) | null = null
    let unsubFallback: (() => void) | null = null

    try {
      unsubMain = onSnapshot(q, (snap) => {
        console.info('Tracking snapshot count:', snap.size)
        processSnapshot(snap)
      }, (err: any) => {
        console.error('Requests snapshot error', err)
        // fall back to a simpler listener without orderBy
        try {
          const qFallback = query(collection(db, 'requests'), where('createdBy', '==', user.uid))
          unsubFallback = onSnapshot(qFallback, (snap) => {
            console.info('Tracking fallback (no-order) snapshot count:', snap.size)
            processSnapshot(snap)
          }, (err2) => console.error('Requests fallback error', err2))
        } catch (e) {
          console.error('Failed to subscribe fallback', e)
        }
      })
    } catch (e) {
      console.error('Failed to subscribe main snapshot', e)
      // try fallback immediately
      const qFallback = query(collection(db, 'requests'), where('createdBy', '==', user.uid))
      unsubFallback = onSnapshot(qFallback, (snap) => {
        console.info('Tracking fallback (no-order) snapshot count:', snap.size)
        processSnapshot(snap)
      }, (err2) => console.error('Requests fallback error', err2))
    }

    // cleanup both listeners
    return () => { if (unsubMain) unsubMain(); if (unsubFallback) unsubFallback() }
  },[user])

  // highlight row if navigated from a notification (lastRequestId in localStorage)
  React.useEffect(() => {
    try {
      const id = typeof window !== 'undefined' ? localStorage.getItem('lastRequestId') : null
      if (!id) return
      // wait until rows are loaded and the requested id exists
      const found = rows.find(r => r.requestId === id)
      if (!found) return
      setHighlightedId(id)
      // scroll to the element if present
      setTimeout(() => {
        const el = document.getElementById(`req-${id}`)
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      // clear highlight after 1s
      const t = setTimeout(() => {
        setHighlightedId(null)
        try { localStorage.removeItem('lastRequestId') } catch (e) { /* ignore */ }
      }, 1000)
      return () => clearTimeout(t)
    } catch (e) {
      // ignore
    }
  }, [rows])

  // Filter rows
  const filteredRows = rows.filter(r => {
    const s = (r.status || '').toLowerCase()
    if (filter === 'all') return true
    if (filter === 'pending') return s === 'pending'
    if (filter === 'ongoing') return s === 'approved' && isOngoing(r)
    if (filter === 'approved') return s === 'approved' && !isOngoing(r)
    if (filter === 'declined') return s === 'declined' || s === 'rejected'
    return true
  })

  // Stats
  const pendingCount = rows.filter(r => r.status?.toLowerCase() === 'pending').length
  
  const ongoingCount = rows.filter(r => r.status?.toLowerCase() === 'approved' && isOngoing(r)).length
  const approvedCount = rows.filter(r => r.status?.toLowerCase() === 'approved' && !isOngoing(r)).length
  const declinedCount = rows.filter(r => ['declined', 'rejected'].includes((r.status || '').toLowerCase())).length
  const completedCount = rows.filter(r => ['completed', 'returned'].includes((r.status || '').toLowerCase())).length

  // Status badge helper
  const getStatusBadge = (r: any) => {
    const s = (r.status || '').toLowerCase()

    if (s === 'approved' && isOngoing(r)) return <span className="badge badge-warning gap-1"><Clock className="w-3 h-3" />Ongoing</span>
    if (s === 'approved' && !isOngoing(r)) return <span className="badge badge-success gap-1"><CheckCircle className="w-3 h-3" />Approved</span>
    if (s === 'pending') return <span className="badge badge-warning gap-1"><Clock className="w-3 h-3" />Pending</span>
    if (s === 'declined' || s === 'rejected') return <span className="badge badge-error gap-1"><XCircle className="w-3 h-3" />Declined</span>
    if (s === 'returned' || s === 'completed') return <span className="badge badge-info gap-1"><RotateCcw className="w-3 h-3" />Returned</span>
    if (s === 'cancelled') return <span className="badge badge-neutral gap-1">Cancelled</span>
    return <span className="badge badge-ghost">{r.status}</span>
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="relative tracking-page min-h-screen overflow-hidden">
      <svg
        className="absolute"
        viewBox="0 0 1440 705"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#74AAF0"
          fillOpacity="1"
          d="M 0 0 L 0 294 C 16 417 42 258 143 381 C 176 427 249 288 319 324 C 380 355 430 441 610 460 C 840 475 926 428 1036 437 C 1130 444 1211 503 1259 448 C 1309 395 1316 525 1440 411 L 1440 0 00Z"
        ></path>
      </svg> 
    <svg
        className="absolute"
        viewBox="0 0 1440 705"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#5091E5"
          fillOpacity="1"
          d="M 0 0 L 0 106 C 14 174 62 154 102 196 C 146 233 212 256 287 273 C 383 290 672 292 762 249 C 843 204 989 143 1053 206 C 1114 269 1336 360 1440 324 L 1440 0 00Z"
        ></path>
      </svg> 
      <Sidebar />
      <div className="relative flex-1 z-90" style={{ marginLeft: 'var(--sidebar-width)' }}>

        <main className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Tracking</h1>

          <section className="bg-white rounded-xl p-4 opacity-80">
            {/* debug UI removed: last created / load last request */}
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className='text-black'>
                  <tr>
                    <th>Purpose</th>
                    <th>Request ID</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody className='text-black'>
                  {rows.length===0 && (
                    <tr><td colSpan={4} className="text-center text-base-content/60 py-6">No requests yet</td></tr>
                  )}
                  {rows.map((r, idx)=> (
                    <tr
                      key={r.requestId || idx}
                      id={`req-${r.requestId}`}
                      className={`hover ${highlightedId === r.requestId ? 'bg-primary/20 animate-pulse' : ''}`}
                    >
                      <td className="max-w-md">
                        <div className="font-medium">{r.purpose || 'Untitled Request'}</div>
                        {r.duration && (
                          <div className="text-xs text-base-content/60 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {r.duration}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-base-300 px-2 py-1 rounded font-mono">
                            {r.requestId?.slice(0, 8)}...
                          </code>
                          <button
                            className="btn btn-ghost btn-xs btn-circle tooltip"
                            data-tip={copiedId === r.requestId ? 'Copied!' : 'Copy ID'}
                            onClick={() => copyToClipboard(r.requestId)}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td>{getStatusBadge(r)}</td>
                      <td>
                        {r.remarks ? (
                          <button 
                            className="btn btn-ghost btn-sm gap-1" 
                            onClick={() => { setShowRemarksText(r.remarks); setShowRemarksOpen(true); }}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-sm text-base-content/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Remarks Modal */}
      {showRemarksOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <button 
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" 
              onClick={() => { setShowRemarksOpen(false); setShowRemarksText(''); }}
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              Admin Remarks
            </h3>
            <div className="py-4">
              <div className="bg-base-200 p-4 rounded-lg whitespace-pre-wrap text-sm">
                {showRemarksText}
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => { setShowRemarksOpen(false); setShowRemarksText(''); }}>
                Close
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => { setShowRemarksOpen(false); setShowRemarksText(''); }}>close</button>
          </form>
        </dialog>
      )}
    </div>
  )
}
