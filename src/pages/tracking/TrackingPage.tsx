import React from 'react'
import Sidebar from '../../sidebar'
import './TrackingPage.css'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
// import equipment logic not needed for aggregated tracking view

export default function TrackingPage(){
  const { user } = useAuth()
  const [rows, setRows] = React.useState<Array<any>>([])
  
  const [showRemarksOpen, setShowRemarksOpen] = React.useState(false)
  const [showRemarksText, setShowRemarksText] = React.useState('')
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null)

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
        docs.push({ purpose, requestId, status, remarks, sortKey, duration })
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

  return (
    <div className="tracking-page min-h-screen">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: 'var(--sidebar-width)' }}>

        <main className="p-6">
          <h1 className="text-xl font-semibold mb-4">Tracking</h1>

          <section className="border border-base-300 rounded-md bg-base-100 p-4">
            {/* debug UI removed: last created / load last request */}
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Purpose</th>
                    <th>Request ID</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length===0 && (
                    <tr><td colSpan={4} className="text-center text-base-content/60 py-6">No requests yet</td></tr>
                  )}
                  {rows.map((r, idx)=> (
                    <tr
                      key={r.requestId || idx}
                      id={`req-${r.requestId}`}
                      className={highlightedId === r.requestId ? 'bg-purple-300/30 transition-colors' : ''}
                    >
                      <td className="max-w-md">
                        <div className="font-semibold">{r.purpose}</div>
                        {r.duration && <div className="text-sm text-base-content/60 mt-1">Duration: {r.duration}</div>}
                      </td>
                      <td>{r.requestId}</td>
                      <td>{r.status}</td>
                      <td>
                        {r.remarks ? (
                          <button className="btn btn-xs btn-primary" onClick={() => { setShowRemarksText(r.remarks); setShowRemarksOpen(true); }}>Show</button>
                        ) : (
                          <span className="text-sm text-base-content/60">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {showRemarksOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-base-100 p-4 rounded shadow max-w-lg w-full mx-4">
                <h3 className="text-lg font-semibold">Remarks</h3>
                <div className="whitespace-pre-wrap my-3 text-sm">{showRemarksText}</div>
                <div className="flex justify-end">
                  <button className="btn" onClick={() => { setShowRemarksOpen(false); setShowRemarksText(''); }}>Close</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
