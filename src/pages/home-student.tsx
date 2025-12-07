import React from 'react';
import { logicEquipment } from './equipment/logicEquipment';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, doc as docRef, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Bell, X, Eye, XCircle, RotateCcw } from 'lucide-react';

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(v: any) {
  try {
    if (!v) return ''
    let dt: Date
    if (v.toDate && typeof v.toDate === 'function') dt = v.toDate()
    else dt = new Date(v)
    return dt.toLocaleString()
  } catch (e) { return '' }
}

export default function HomeStudent() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [tab, setTab] = React.useState<'all'|'ongoing'|'completed'|'rejected'|'cancelled'>('all');
  const [notifOpen, setNotifOpen] = React.useState(false)
  const [notifAllOpen, setNotifAllOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Array<any>>([])
  const [recentNotifications, setRecentNotifications] = React.useState<Array<any>>([])

  React.useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }

    // process snapshot into request objects and sort by available timestamps
    const processSnapshot = (snap: any) => {
      const docs: any[] = []
      snap.forEach((d: any) => {
        const data = d.data()
        const id = d.id
        // compute sort key from client timestamp or server timestamp fallback
        let sortKey = ''
        if (data && data.createdAtClient) sortKey = data.createdAtClient
        else if (data && data.createdAt && typeof data.createdAt.toDate === 'function') sortKey = data.createdAt.toDate().toISOString()
        else if (data && data.createdAt) {
          try { sortKey = new Date(data.createdAt).toISOString() } catch { sortKey = '' }
        }
        docs.push({ id, ...data, sortKey })
      })
      docs.sort((a,b) => (b.sortKey || '').localeCompare(a.sortKey || ''))
      console.info('HomeStudent requests snapshot count:', docs.length)
      setRequests(docs)
      try {
        // compute notifications by comparing stored seen statuses to current statuses
        const storedRaw = localStorage.getItem('studentSeenStatuses')

        // helper to extract admin info
        const makeEntry = (d: any, prev: string | null, now: string) => {
          let adminRemarks = d.declinedRemarks || d.remarks || null
          let actionAt: string | null = null
          try {
            if (d.declinedAt && typeof d.declinedAt.toDate === 'function') actionAt = d.declinedAt.toDate().toLocaleString()
            else if (d.approvedAt && typeof d.approvedAt.toDate === 'function') actionAt = d.approvedAt.toDate().toLocaleString()
            else if (d.returnedAt && typeof d.returnedAt.toDate === 'function') actionAt = d.returnedAt.toDate().toLocaleString()
            else if (d.cancelledAt && typeof d.cancelledAt.toDate === 'function') actionAt = d.cancelledAt.toDate().toLocaleString()
          } catch (e) {
            actionAt = null
          }
          return { id: d.id, purpose: d.purpose, oldStatus: prev, status: now, adminRemarks, actionAt }
        }

        // historic declined/rejected and approved (should always be visible in View All when there are no recent changes)
        const historicDeclined = docs.filter((d:any) => {
          const s = (d.status || '').toString().toLowerCase()
          return s === 'declined' || s === 'rejected'
        }).map((d:any) => makeEntry(d, (d.status || '').toString(), (d.status || '').toString()))
        const historicApproved = docs.filter((d:any) => {
          const s = (d.status || '').toString().toLowerCase()
          return s === 'approved'
        }).map((d:any) => makeEntry(d, (d.status || '').toString(), (d.status || '').toString()))

        if (!storedRaw) {
          // first run: initialize seen map so existing requests don't produce recent notifications
          const initialMap: any = {};
          docs.forEach(d => { initialMap[d.id] = (d.status || 'ongoing').toString() })
          localStorage.setItem('studentSeenStatuses', JSON.stringify(initialMap))
          // show historic declined/rejected in View all but no recent notifications
          setRecentNotifications([])
          setNotifications([...historicApproved, ...historicDeclined])
        } else {
          const stored: any = JSON.parse(storedRaw || '{}')
          const changes: any[] = []
          docs.forEach(d => {
            const prev = stored[d.id]
            const now = (d.status || 'ongoing').toString()
            // consider it a recent notification only if we knew about the request before (prev exists) and the status changed
            if (typeof prev !== 'undefined' && prev !== now) {
              changes.push(makeEntry(d, prev, now))
            }
          })
          // notifications for View All = recent changes first, then historic declined/rejected that aren't already in changes
          const byId = new Set(changes.map(c => c.id))
          const combined = [
            ...changes,
            ...historicApproved.filter(h => !byId.has(h.id)),
            ...historicDeclined.filter(h => !byId.has(h.id)),
          ]
          setRecentNotifications(changes)
          setNotifications(combined)
        }
      } catch (e) {
        console.warn('Failed to compute notifications', e)
        setRecentNotifications([])
        setNotifications([])
      }
    }

    let unsubMain: (() => void) | null = null
    let unsubFallback: (() => void) | null = null

    try {
      const q = query(
        collection(db, 'requests'),
        where('createdBy', '==', user.uid),
        orderBy('createdAtClient', 'desc'),
        limit(20)
      )

      unsubMain = onSnapshot(q, (snap) => {
        processSnapshot(snap)
      }, (err) => {
        console.error('HomeStudent snapshot error', err)
        // fall back to unordered query
        try {
          const qf = query(collection(db, 'requests'), where('createdBy', '==', user.uid), limit(20))
          unsubFallback = onSnapshot(qf, (snap) => processSnapshot(snap), (err2) => console.error('HomeStudent fallback error', err2))
        } catch (e) {
          console.error('HomeStudent failed to subscribe fallback', e)
        }
      })
    } catch (e) {
      console.error('HomeStudent failed to subscribe main', e)
      const qf = query(collection(db, 'requests'), where('createdBy', '==', user.uid), limit(20))
      unsubFallback = onSnapshot(qf, (snap) => processSnapshot(snap), (err2) => console.error('HomeStudent fallback error', err2))
    }

    return () => { if (unsubMain) unsubMain(); if (unsubFallback) unsubFallback() }
  }, [user]);

  let filtered = requests.filter(r => {
    if (tab === 'all') return true;
    const s = (r.status || 'ongoing').toString().toLowerCase();
    // treat returned requests as completed for the student view
    const isCompletedLike = s === 'completed' || s === 'returned';
    // treat admin-declined statuses as rejected for student view (admin may write 'Declined')
    const isRejectedLike = s === 'rejected' || s === 'declined';
    return (tab === 'ongoing' && s === 'ongoing') || (tab === 'completed' && isCompletedLike) || (tab === 'rejected' && isRejectedLike) || (tab === 'cancelled' && s === 'cancelled');
  });

  // When showing "All", order groups as: approved -> ongoing/pending -> declined/rejected -> returned -> cancelled
  if (tab === 'all') {
    const priority = (s: string) => {
      const st = (s || '').toString().toLowerCase();
      if (st === 'approved') return 0;
      if (st === 'ongoing' || st === 'pending' || st === '') return 1;
      if (st === 'declined' || st === 'rejected') return 2;
      if (st === 'returned') return 3;
      if (st === 'cancelled') return 4;
      return 5;
    }

    filtered = filtered.slice().sort((a,b) => {
      const pa = priority((a.status || 'ongoing').toString());
      const pb = priority((b.status || 'ongoing').toString());
      if (pa !== pb) return pa - pb;
      // same group -> newest first by sortKey
      const ka = a.sortKey || '';
      const kb = b.sortKey || '';
      return kb.localeCompare(ka);
    });
  }

  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [showModalRequest, setShowModalRequest] = React.useState<any | null>(null)
  const { equipmentList } = logicEquipment();

  // reuse admin-style time formatter so modal matches admin modal formatting
  const formatTime = (t: any) => {
    if (!t) return '';
    try {
      if (typeof t === 'string') {
        if (/[ap]m/i.test(t)) return t.trim();
        const m = t.match(/^(\d{1,2}):(\d{2})$/);
        if (m) {
          let h = parseInt(m[1], 10);
          const min = m[2];
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          return `${h}:${min} ${ampm}`;
        }
      }
      const d = typeof t === 'string' || typeof t === 'number' ? new Date(t) : t;
      if (d && typeof d.toLocaleTimeString === 'function') {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    } catch (e) {}
    return String(t);
  }

  async function handleCancel(requestId: string) {
    if (!confirm('Cancel this request? This will mark it as cancelled.')) return
    try {
      setBusyId(requestId)
      await updateDoc(docRef(db, 'requests', requestId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
      })
      // snapshot will update the UI automatically
    } catch (e) {
      console.error('Failed to cancel request', e)
      alert('Failed to cancel request; see console')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReturn(requestId: string) {
    if (!confirm('Mark this request as returned? This will mark the item(s) as returned.')) return
    try {
      setBusyId(requestId)
      await updateDoc(docRef(db, 'requests', requestId), {
        status: 'returned',
        returnedAt: serverTimestamp(),
      })
    } catch (e) {
      console.error('Failed to mark request returned', e)
      alert('Failed to mark returned; see console')
    } finally {
      setBusyId(null)
    }
  }

  // mark current statuses as seen (store in localStorage)
  function markNotificationsSeen() {
    try {
  const seenMap: any = {};
  (requests || []).forEach((r:any) => { seenMap[r.id] = (r.status || 'ongoing').toString() })
      localStorage.setItem('studentSeenStatuses', JSON.stringify(seenMap))
      setRecentNotifications([])
    } catch (e) {
      console.warn('Failed to mark notifications seen', e)
    }
  }

  function toggleNotif() {
    const next = !notifOpen
    setNotifOpen(next)
    if (next) {
      // when opening, mark current statuses as seen so dot disappears
      markNotificationsSeen()
    }
  }

  const nav = useNavigate();

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const s = (status || 'ongoing').toLowerCase();
    if (s === 'approved') return <span className="badge badge-success">Approved</span>;
    if (s === 'ongoing' || s === 'pending') return <span className="badge badge-warning">Ongoing</span>;
    if (s === 'declined' || s === 'rejected') return <span className="badge badge-error">Rejected</span>;
    if (s === 'returned' || s === 'completed') return <span className="badge badge-info">Completed</span>;
    if (s === 'cancelled') return <span className="badge badge-neutral">Cancelled</span>;
    return <span className="badge">{status}</span>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Dashboard</h1>
          <p className="text-base-content/70">Welcome, {user?.displayName ?? user?.email?.split('@')[0] ?? 'Student'}! Today is {formatDate(new Date())}</p>
        </div>

        {/* Notification dropdown */}
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle" onClick={toggleNotif}>
            <div className="indicator">
              <Bell className="w-5 h-5" />
              {recentNotifications.length > 0 && (
                <span className="indicator-item badge badge-error badge-xs"></span>
              )}
            </div>
          </label>
          {notifOpen && (
            <div tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box w-80 shadow-xl z-50">
              <div className="p-3 border-b border-base-300 flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotifOpen(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-64 overflow-auto">
                {recentNotifications.length === 0 ? (
                  notifications.length === 0 ? (
                    <div className="p-4 text-center text-base-content/60">No new notifications</div>
                  ) : (
                    notifications.slice(0, 4).map(n => (
                      <div
                        key={n.id}
                        className="p-3 hover:bg-base-300 cursor-pointer transition-colors"
                        onClick={() => { try { localStorage.setItem('lastRequestId', n.id) } catch {} setNotifOpen(false); nav('/tracking') }}
                      >
                        <div className="font-medium text-sm">{n.purpose || 'Request update'}</div>
                        <div className="text-xs text-base-content/60">{n.status}</div>
                      </div>
                    ))
                  )
                ) : (
                  recentNotifications.slice(0, 4).map(n => (
                    <div
                      key={n.id}
                      className="p-3 hover:bg-base-300 cursor-pointer transition-colors"
                      onClick={() => { try { localStorage.setItem('lastRequestId', n.id) } catch {} setNotifOpen(false); nav('/tracking') }}
                    >
                      <div className="font-medium text-sm">{n.purpose || 'Request update'}</div>
                      <div className="text-xs text-base-content/60">{n.oldStatus} → {n.status}{n.actionAt ? ` · ${n.actionAt}` : ''}</div>
                      {n.adminRemarks && (
                        <div className="text-xs mt-1 text-base-content/50">Remarks: {n.adminRemarks}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-base-300">
                <button className="btn btn-ghost btn-sm btn-block" onClick={() => { setNotifOpen(false); setNotifAllOpen(true); }}>
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
        <div className="stat">
          <div className="stat-title">Total Requests</div>
          <div className="stat-value">{requests.length}</div>
          <div className="stat-desc">All time</div>
        </div>
        <div className="stat">
          <div className="stat-title">Ongoing</div>
          <div className="stat-value text-warning">{requests.filter(r => (r.status || 'ongoing').toLowerCase() === 'ongoing').length}</div>
          <div className="stat-desc">Pending approval</div>
        </div>
        <div className="stat">
          <div className="stat-title">Approved</div>
          <div className="stat-value text-success">{requests.filter(r => r.status?.toLowerCase() === 'approved').length}</div>
          <div className="stat-desc">Ready for use</div>
        </div>
        <div className="stat">
          <div className="stat-title">Completed</div>
          <div className="stat-value text-info">{requests.filter(r => ['completed', 'returned'].includes((r.status || '').toLowerCase())).length}</div>
          <div className="stat-desc">Items returned</div>
        </div>
      </div>

      {/* Requests Table Card */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-0">
          {/* Tabs Header */}
          <div className="p-4 border-b border-base-300">
            <div role="tablist" className="tabs tabs-boxed bg-base-300">
              <a role="tab" className={`tab ${tab === 'all' ? 'tab-active' : ''}`} onClick={() => setTab('all')}>All</a>
              <a role="tab" className={`tab ${tab === 'ongoing' ? 'tab-active' : ''}`} onClick={() => setTab('ongoing')}>Ongoing</a>
              <a role="tab" className={`tab ${tab === 'completed' ? 'tab-active' : ''}`} onClick={() => setTab('completed')}>Completed</a>
              <a role="tab" className={`tab ${tab === 'rejected' ? 'tab-active' : ''}`} onClick={() => setTab('rejected')}>Rejected</a>
              <a role="tab" className={`tab ${tab === 'cancelled' ? 'tab-active' : ''}`} onClick={() => setTab('cancelled')}>Cancelled</a>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Purpose</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-base-content/60">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover">
                      <td>
                        <div className="font-medium">{r.purpose || 'Item Request'}</div>
                        <div className="text-xs text-base-content/60">
                          {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : '')}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-ghost">
                          {Array.isArray(r.items) ? r.items.reduce((s: any, i: any) => s + (i.qty || 0), 0) : '-'}
                        </span>
                      </td>
                      <td>{getStatusBadge(r.status)}</td>
                      <td>
                        {((r.status || '').toString().toLowerCase() === 'ongoing') && (
                          <button 
                            className="btn btn-error btn-sm gap-1" 
                            disabled={busyId === r.id} 
                            onClick={() => handleCancel(r.id)}
                          >
                            {busyId === r.id ? <span className="loading loading-spinner loading-xs"></span> : <XCircle className="w-4 h-4" />}
                            Cancel
                          </button>
                        )}
                        {((r.status || '').toString().toLowerCase() === 'approved') && (
                          <button 
                            className="btn btn-primary btn-sm gap-1" 
                            disabled={busyId === r.id} 
                            onClick={() => handleReturn(r.id)}
                          >
                            {busyId === r.id ? <span className="loading loading-spinner loading-xs"></span> : <RotateCcw className="w-4 h-4" />}
                            Return
                          </button>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setShowModalRequest(r)}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Request Details Modal */}
      {showModalRequest && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowModalRequest(null)}>
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg mb-4">Request Details</h3>
            
            <div className="text-xs text-base-content/60">Request ID</div>
            <div className="font-mono text-sm mb-4 bg-base-300 p-2 rounded break-all">{showModalRequest.id}</div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Requester</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{showModalRequest.createdByName || showModalRequest.createdBy || '-'}</div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Requested At</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{formatDateTime(showModalRequest.createdAt)}</div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Adviser / Leader</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{showModalRequest.adviser || '-'}</div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Status</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{getStatusBadge(showModalRequest.status)}</div>
              </div>
              <div className="form-control md:col-span-2">
                <label className="label"><span className="label-text text-xs">Purpose</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{showModalRequest.purpose || '-'}</div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Start</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{showModalRequest.startDate} {formatTime(showModalRequest.start)}</div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">End</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{showModalRequest.endDate} {formatTime(showModalRequest.end)}</div>
              </div>
              <div className="form-control md:col-span-2">
                <label className="label"><span className="label-text text-xs">Items</span></label>
                <div className="bg-base-300 p-2 rounded">
                  <ul className="space-y-1">
                    {showModalRequest.items?.map((item: any) => {
                      const equipment = equipmentList.find((e: any) => e.equipmentID === item.equipmentID);
                      return (
                        <li key={item.equipmentID} className="flex justify-between text-sm">
                          <span>{equipment?.name || item.name || item.equipmentID}</span>
                          <span className="badge badge-sm">{item.qty} pcs</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="divider my-2"></div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total</span>
                    <span>{(showModalRequest.items || []).reduce((acc: any, i: any) => acc + (i.qty || 0), 0)} pcs</span>
                  </div>
                </div>
              </div>
              <div className="form-control md:col-span-2">
                <label className="label"><span className="label-text text-xs">Admin Remarks</span></label>
                <div className="bg-base-300 p-2 rounded text-sm whitespace-pre-wrap">{showModalRequest.declinedRemarks || showModalRequest.remarks || '—'}</div>
              </div>
            </div>
            
            <div className="modal-action">
              <button className="btn" onClick={() => setShowModalRequest(null)}>Close</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowModalRequest(null)}>close</button>
          </form>
        </dialog>
      )}

      {/* View All Notifications Modal */}
      {notifAllOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setNotifAllOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg mb-4">All Notifications</h3>
            
            <div className="divide-y divide-base-300 max-h-96 overflow-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-base-content/60">No notifications</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="py-3">
                    <div className="font-medium">{n.purpose || 'Request update'}</div>
                    <div className="text-sm text-base-content/60">{n.oldStatus} → {n.status}{n.actionAt ? ` · ${n.actionAt}` : ''}</div>
                    {n.adminRemarks && (
                      <div className="text-sm mt-1 p-2 bg-base-300 rounded">
                        <span className="text-xs text-base-content/60">Remarks:</span>
                        <p className="whitespace-pre-wrap">{n.adminRemarks}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="modal-action">
              <button className="btn" onClick={() => setNotifAllOpen(false)}>Close</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setNotifAllOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
