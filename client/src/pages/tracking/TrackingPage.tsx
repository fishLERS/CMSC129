import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRequests } from '../../hooks/useRequests'
import { isOngoing } from "../../utils/requestTime"
import { MapPin, Clock, CheckCircle, XCircle, AlertCircle, FileText, X, Eye, Copy, RotateCcw } from 'lucide-react'

export default function TrackingPage(){
  const { user } = useAuth()
  const { requests, isLoading } = useRequests(user?.uid)
  const [rows, setRows] = React.useState<Array<any>>([])
  const [filter, setFilter] = React.useState<'all' | 'pending'| 'ongoing' | 'completed' | 'approved' | 'declined'>('all')
  
  const [showRemarksOpen, setShowRemarksOpen] = React.useState(false)
  const [showRemarksText, setShowRemarksText] = React.useState('')
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  /**
   * Transform API requests into row format for display.
   */
  React.useEffect(() => {
    if (!requests || requests.length === 0) {
      setRows([]);
      return;
    }

    const docs = requests.map((req) => {
      const purpose = req.purpose || '';
      const status = req.status || 'pending';
      const remarks = req.rejectionReason || '';

      // Compute human-friendly duration from startDate/endDate
      let duration = '';
      try {
        const sDate = req.startDate || '';
        const eDate = req.endDate || '';
        if (sDate || eDate) {
          const startIso = (sDate || eDate) + 'T00:00';
          const endIso = (eDate || sDate) + 'T23:59';
          const sd = new Date(startIso);
          const ed = new Date(endIso);
          if (!isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
            const diffMs = Math.max(0, ed.getTime() - sd.getTime());
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
            const parts: string[] = [];
            if (diffDays > 0) parts.push(`${diffDays}d`);
            if (diffHours > 0) parts.push(`${diffHours}h`);
            duration = `${sd.toLocaleString()} → ${ed.toLocaleString()}${parts.length ? ` (${parts.join(' ')})` : ''}`;
          }
        }
      } catch (e) {
        duration = '';
      }

      return {
        purpose,
        requestId: req.requestID || '',
        status,
        remarks,
        sortKey: req.createdAt || '',
        startDate: req.startDate,
        endDate: req.endDate,
        duration,
      };
    });

    // Sort by date descending (newest first)
    docs.sort((a, b) => (b.sortKey || '').localeCompare(a.sortKey || ''));
    setRows(docs);
  }, [requests]);

  // Highlight row if navigated from a notification (lastRequestId in localStorage)
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          Request Tracking
        </h1>
        <p className="text-base-content/70">Monitor the status of your equipment requests</p>
      </div>

      {/* Stats */}
      <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-200 w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <FileText className="w-8 h-8" />
          </div>
          <div className="stat-title">Total Requests</div>
          <div className="stat-value">{rows.length}</div>
          <div className="stat-desc">All time</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-warning">
            <Clock className="w-8 h-8" />
          </div>
          <div className="stat-title">Pending</div>
          <div className="stat-value text-warning">{pendingCount}</div>
          <div className="stat-desc">Pending approval</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="stat-title">Approved</div>
          <div className="stat-value text-success">{approvedCount}</div>
          <div className="stat-desc">Ready for use</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-error">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="stat-title">Declined</div>
          <div className="stat-value text-error">{declinedCount}</div>
          <div className="stat-desc">See remarks</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-0">
          {/* Filter Tabs */}
          <div className="p-4 border-b border-base-300">
            <div role="tablist" className="tabs tabs-boxed bg-base-300 w-fit">
              <a role="tab" className={`tab ${filter === 'all' ? 'tab-active' : ''}`} onClick={() => setFilter('all')}>
                All ({rows.length})
              </a>
              <a role="tab" className={`tab ${filter === 'pending' ? 'tab-active' : ''}`} onClick={() => setFilter('pending')}>
                Pending ({pendingCount})
              </a>
              <a role="tab" className={`tab ${filter === 'ongoing' ? 'tab-active' : ''}`} onClick={() => setFilter('ongoing')}>
                Ongoing ({ongoingCount})
              </a>
              <a role="tab" className={`tab ${filter === 'approved' ? 'tab-active' : ''}`} onClick={() => setFilter('approved')}>
                Approved ({approvedCount})
              </a>
              <a role="tab" className={`tab ${filter === 'completed' ? 'tab-active' : ''}`} onClick={() => setFilter('completed')}>
                Completed ({completedCount})
              </a>
              <a role="tab" className={`tab ${filter === 'declined' ? 'tab-active' : ''}`} onClick={() => setFilter('declined')}>
                Declined ({declinedCount})
              </a>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Purpose</th>
                  <th>Request ID</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-base-content/60">
                        <MapPin className="w-12 h-12 opacity-30" />
                        <p className="font-medium">No requests found</p>
                        <p className="text-sm">
                          {filter === 'all' 
                            ? "You haven't made any requests yet" 
                            : `No ${filter} requests`}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => (
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
