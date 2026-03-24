import React from 'react';
import { logicEquipment } from './equipment/logicEquipment';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { isOngoing } from "../utils/requestTime"
import { collection, query, orderBy, limit, onSnapshot, where, doc as docRef, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Bell, X, Eye, XCircle, RotateCcw } from 'lucide-react';
import LoadingOverlay from '../components/LoadingOverlay';

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
  const [tab, setTab] = React.useState<'all'|'pending'| 'ongoing' | 'approved' |'completed'|'rejected'|'cancelled'|'accountability'>('all');
  const [notifOpen, setNotifOpen] = React.useState(false)
  const [notifAllOpen, setNotifAllOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Array<any>>([])
  const [recentNotifications, setRecentNotifications] = React.useState<Array<any>>([])
  const [alertMessage, setAlertMessage] = React.useState<string | null>(null)
  const [accountabilities, setAccountabilities] = React.useState<any[]>([])
  const [accountabilityRequestInfo, setAccountabilityRequestInfo] = React.useState<Record<string, { purpose?: string; createdAt?: any }>>({})

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
        const storedStatusRaw = localStorage.getItem('studentSeenStatuses')
        const historyRaw = localStorage.getItem('studentNotificationHistory')
        let history: any[] = []
        try {
          const parsed = JSON.parse(historyRaw || '[]')
          if (Array.isArray(parsed)) history = parsed
        } catch {
          history = []
        }
        const historyKeys = new Set(
          history.map(entry => `${entry.id}-${(entry.oldStatus ?? 'NEW')}->${entry.status}`)
        )

        const makeEntry = (d: any, prev: string | null, now: string) => {
          let adminRemarks = d.declinedRemarks || d.remarks || null
          let actionAt: string | null = null
          try {
            if (d.declinedAt && typeof d.declinedAt.toDate === 'function') actionAt = d.declinedAt.toDate().toLocaleString()
            else if (d.approvedAt && typeof d.approvedAt.toDate === 'function') actionAt = d.approvedAt.toDate().toLocaleString()
            else if (d.returnedAt && typeof d.returnedAt.toDate === 'function') actionAt = d.returnedAt.toDate().toLocaleString()
            else if (d.cancelledAt && typeof d.cancelledAt.toDate === 'function') actionAt = d.cancelledAt.toDate().toLocaleString()
          } catch {
            actionAt = null
          }
          return {
            id: d.id,
            purpose: d.purpose,
            oldStatus: prev,
            status: now,
            adminRemarks,
            actionAt,
            timestamp: Date.now(),
            transitionKey: `${prev ?? 'NEW'}->${now}`
          }
        }

        const seedHistoryFromDocs = () => {
          const entries = docs.map(d => makeEntry(d, null, (d.status || 'ongoing').toString()))
          const combined = [...history]
          entries.forEach(entry => {
            const key = `${entry.id}-${entry.transitionKey}`
            if (!historyKeys.has(key)) {
              historyKeys.add(key)
              combined.push(entry)
            }
          })
          const trimmed = combined.slice(-200)
          localStorage.setItem('studentNotificationHistory', JSON.stringify(trimmed))
          return trimmed
        }

        if (!storedStatusRaw) {
          const initialMap: any = {}
          docs.forEach(d => { initialMap[d.id] = (d.status || 'ongoing').toString() })
          localStorage.setItem('studentSeenStatuses', JSON.stringify(initialMap))
          const seeded = seedHistoryFromDocs()
          setRecentNotifications([])
          setNotifications(seeded.slice().sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)))
        } else {
          const stored: any = JSON.parse(storedStatusRaw || '{}')
          if (!history.length) {
            history = seedHistoryFromDocs()
          }
          const changes: any[] = []
          docs.forEach(d => {
            const prev = stored[d.id]
            const now = (d.status || 'ongoing').toString()
            const transitionKey = `${prev ?? 'NEW'}->${now}`
            if ((typeof prev === 'undefined' || prev !== now) && !historyKeys.has(`${d.id}-${transitionKey}`)) {
              const entry = makeEntry(d, prev, now)
              changes.push(entry)
              historyKeys.add(`${d.id}-${transitionKey}`)
            }
          })
          let updatedHistory = history
          if (changes.length) {
            updatedHistory = [...history, ...changes].slice(-200)
            localStorage.setItem('studentNotificationHistory', JSON.stringify(updatedHistory))
          }
          setRecentNotifications(changes)
          setNotifications(updatedHistory.slice().sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)))
        }
      } catch (e) {
        console.warn('Failed to compute notifications', e)
        setRecentNotifications([])
        setNotifications([])
      }
    }

    let unsubMain: (() => void) | null = null
    let unsubFallback: (() => void) | null = null

    console.log('HomeStudent: Loading requests for user:', user.uid)
    
    try {
      const q = query(
        collection(db, 'requests'),
        where('createdBy', '==', user.uid),
        orderBy('createdAtClient', 'desc'),
        limit(20)
      )

      unsubMain = onSnapshot(q, (snap) => {
        console.log('HomeStudent: Got snapshot with', snap.docs.length, 'documents')
        processSnapshot(snap)
      }, (err) => {
        console.error('HomeStudent snapshot error', err)
        console.log('HomeStudent: Falling back to unordered query...')
        // fall back to unordered query
        try {
          const qf = query(collection(db, 'requests'), where('createdBy', '==', user.uid), limit(20))
          unsubFallback = onSnapshot(qf, (snap) => {
            console.log('HomeStudent: Fallback query returned', snap.docs.length, 'documents')
            processSnapshot(snap)
          }, (err2) => console.error('HomeStudent fallback error', err2))
        } catch (e) {
          console.error('HomeStudent failed to subscribe fallback', e)
        }
      })
    } catch (e) {
      console.error('HomeStudent failed to subscribe main', e)
      const qf = query(collection(db, 'requests'), where('createdBy', '==', user.uid), limit(20))
      unsubFallback = onSnapshot(qf, (snap) => {
        console.log('HomeStudent: Direct fallback returned', snap.docs.length, 'documents')
        processSnapshot(snap)
      }, (err2) => console.error('HomeStudent fallback error', err2))
    }

    return () => { if (unsubMain) unsubMain(); if (unsubFallback) unsubFallback() }
  }, [user]);

  let filteredRequests = requests.filter(r => {
    const s = (r.status || '').toLowerCase()

    if (tab === 'all') return true
    if (tab === 'pending') return s === 'pending'
    if (tab === 'ongoing') return s === 'approved' && isOngoing(r)
    if (tab === 'approved') return s === 'approved' && !isOngoing(r)
    if (tab === 'completed') return ['completed', 'returned'].includes(s)
    if (tab === 'rejected') return ['declined', 'rejected'].includes(s)
    if (tab === 'cancelled') return s === 'cancelled'

    return true
  })


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

    filteredRequests = filteredRequests.slice().sort((a,b) => {
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
  const [showAccountabilityModal, setShowAccountabilityModal] = React.useState<any | null>(null)
  const { equipmentList, isLoading: isEquipmentLoading } = logicEquipment();
  const isAccountabilityTab = tab === 'accountability'

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
      setAlertMessage('Failed to cancel request. Please try again.')
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
      setAlertMessage('Failed to mark returned. Please try again.')
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
  const getStatusBadge = (r: any) => {
    const s = (r.status || '').toLowerCase();
    if (s === 'approved' && isOngoing(r)) return <span className="badge badge-success">Ongoing</span>;
    if (s === 'approved' && !isOngoing(r)) return <span className="badge badge-success">Approved</span>;
    if (s === 'pending') return <span className="badge badge-warning">Pending</span>;
    if (s === 'declined' || s === 'rejected') return <span className="badge badge-error">Rejected</span>;
    if (s === 'returned' || s === 'completed') return <span className="badge badge-info">Completed</span>;
    if (s === 'cancelled') return <span className="badge badge-neutral">Cancelled</span>;
    return <span className="badge">{r.status}</span>;
  };

  const ongoingCount = requests.filter( r => r.status?.toLowerCase() === 'approved' && isOngoing(r)).length
  const parseAccountabilityDetails = (details: string) => {
    return (details || '')
      .split(/[\n,]+/)
      .map(part => part.trim())
      .filter(Boolean)
  }

  const formatAccountabilityDetails = (details: string) => parseAccountabilityDetails(details).join(', ')

  const getAccountabilityBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase()
    if (s === 'resolved' || s === 'completed') return <span className="badge badge-success">Resolved</span>
    if (s === 'overdue') return <span className="badge badge-error">Overdue</span>
    return <span className="badge badge-warning capitalize">{status || 'Pending'}</span>
  }

  const getAccountabilityPurpose = (acc: any) => {
    if (!acc) return 'Accountability'
    const info = acc.requestId ? accountabilityRequestInfo[acc.requestId] : null
    return acc.purpose || info?.purpose || acc.reason || 'Accountability'
  }

  const getAccountabilityRequestedAt = (acc: any) => {
    if (!acc) return ''
    const info = acc.requestId ? accountabilityRequestInfo[acc.requestId] : null
    return formatDateTime(info?.createdAt || acc.createdAt) || (acc.due ? `Due ${acc.due}` : '')
  }

  React.useEffect(() => {
    if (!user) {
      setAccountabilities([])
      setAccountabilityRequestInfo({})
      return
    }
    const processSnapshot = (snap: any) => {
      const list: any[] = []
      snap.forEach((d: any) => {
        const data = d.data()
        const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : (data.dueDate ? new Date(data.dueDate) : null)
        list.push({
          id: d.id,
          due: dueDate ? dueDate.toLocaleDateString() : 'No date set',
          details: data.details || '',
          status: data.status || 'pending',
          reason: data.reason || '',
          createdAt: data.createdAt,
          requestId: data.requestId || null,
          purpose: data.purpose || '',
        })
      })
      setAccountabilities(list)
    }
    let unsubMain: (() => void) | null = null
    let unsubFallback: (() => void) | null = null
    try {
      const q = query(collection(db, 'accountabilities'), where('createdBy', '==', user.uid), orderBy('dueDate', 'asc'))
      unsubMain = onSnapshot(q, (snap) => processSnapshot(snap), (err) => {
        console.error('Student accountabilities snapshot error', err)
        try {
          const qf = query(collection(db, 'accountabilities'), where('createdBy', '==', user.uid))
          unsubFallback = onSnapshot(qf, (snap) => processSnapshot(snap), (err2) => console.error('Student accountabilities fallback error', err2))
        } catch (e) {
          console.error('Failed to subscribe accountabilities fallback', e)
        }
      })
    } catch (e) {
      console.error('Failed to subscribe accountabilities main', e)
      const qf = query(collection(db, 'accountabilities'), where('createdBy', '==', user.uid))
      unsubFallback = onSnapshot(qf, (snap) => processSnapshot(snap), (err2) => console.error('Student accountabilities fallback error', err2))
    }
    return () => { if (unsubMain) unsubMain(); if (unsubFallback) unsubFallback() }
  }, [user])

  React.useEffect(() => {
    const missingIds = Array.from(
      new Set(
        accountabilities
          .map(acc => acc.requestId)
          .filter((id): id is string => !!id && !accountabilityRequestInfo[id])
      )
    )
    if (!missingIds.length) return

    let cancelled = false
    ;(async () => {
      const updates: Record<string, { purpose?: string; createdAt?: any }> = {}
      await Promise.all(
        missingIds.map(async (requestId) => {
          try {
            const snap = await getDoc(docRef(db, 'requests', requestId))
            if (snap.exists()) {
              const data: any = snap.data()
              updates[requestId] = {
                purpose: data.purpose || '',
                createdAt: data.createdAt || data.createdAtClient || null,
              }
            } else {
              updates[requestId] = { purpose: '', createdAt: null }
            }
          } catch (e) {
            console.warn('Failed to load accountability request info', e)
            updates[requestId] = { purpose: '', createdAt: null }
          }
        })
      )

      if (!cancelled && Object.keys(updates).length > 0) {
        setAccountabilityRequestInfo(prev => ({ ...prev, ...updates }))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accountabilities, accountabilityRequestInfo])


  return (
    <>
      <LoadingOverlay show={isEquipmentLoading} message="Loading equipment data..." />
      <div className="p-6 space-y-6">
        {alertMessage && (
          <div className="alert alert-error">
            <span>{alertMessage}</span>
            <button className="btn btn-sm" onClick={() => setAlertMessage(null)}>Close</button>
          </div>
        )}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Dashboard</h1>
          <p className="text-base-content/70">Welcome, {user?.displayName ?? user?.email?.split('@')[0] ?? 'Student'}! Today is {formatDate(new Date())}</p>
        </div>
                
        <button className="btn btn-primary btn-sm" onClick={() => nav("/requestpage")}>
          + Request Equipment
        </button>

        {/* Notification dropdown */}
        <div className="relative">
          <button className="btn btn-ghost btn-circle" onClick={toggleNotif}>
            <div className="indicator">
              <Bell className="w-5 h-5" />
              {recentNotifications.length > 0 && (
                <span className="indicator-item badge badge-error badge-xs"></span>
              )}
            </div>
          </button>
          {notifOpen && (
            <>
              {/* Backdrop to close dropdown when clicking outside */}
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)}></div>
              <div className="absolute right-0 mt-2 bg-base-100 border border-base-300 rounded-box w-80 shadow-2xl z-50">
                <div className="p-3 border-b border-base-300 bg-primary/10 flex items-center justify-between rounded-t-box">
                  <span className="font-semibold text-primary">Notifications</span>
                  <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotifOpen(false)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-64 overflow-auto divide-y divide-base-200">
                  {recentNotifications.length === 0 ? (
                    notifications.length === 0 ? (
                      <div className="p-4 text-center text-base-content/60">No new notifications</div>
                    ) : (
                      notifications.slice(0, 4).map(n => (
                        <div
                          key={n.id}
                          className="p-3 hover:bg-primary/5 cursor-pointer transition-colors"
                          onClick={() => { try { localStorage.setItem('lastRequestId', n.id) } catch {} setNotifOpen(false); nav('/tracking') }}
                        >
                          <div className="font-medium text-sm text-base-content">{n.purpose || 'Request update'}</div>
                          <div className="text-xs text-base-content/70 mt-1">{n.status}</div>
                        </div>
                      ))
                    )
                  ) : (
                    recentNotifications.slice(0, 4).map(n => (
                      <div
                        key={n.id}
                        className="p-3 hover:bg-primary/5 cursor-pointer transition-colors bg-warning/5"
                        onClick={() => { try { localStorage.setItem('lastRequestId', n.id) } catch {} setNotifOpen(false); nav('/tracking') }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="badge badge-warning badge-xs">New</span>
                          <span className="font-medium text-sm text-base-content">{n.purpose || 'Request update'}</span>
                        </div>
                        <div className="text-xs text-base-content/70 mt-1">{n.oldStatus} → {n.status}{n.actionAt ? ` · ${n.actionAt}` : ''}</div>
                        {n.adminRemarks && (
                          <div className="text-xs mt-1 text-base-content/60 italic">Remarks: {n.adminRemarks}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-base-300 bg-base-200/50 rounded-b-box">
                  <button className="btn btn-primary btn-sm btn-block" onClick={() => { setNotifOpen(false); setNotifAllOpen(true); }}>
                    View all notifications
                  </button>
                </div>
              </div>
            </>
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
          <div className="stat-title">Pending</div>
          <div className="stat-value text-warning">{requests.filter(r => (r.status).toLowerCase() === 'pending').length}</div>
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
              <a role="tab" className={`tab ${tab === 'pending' ? 'tab-active' : ''}`} onClick={() => setTab('pending')}>Pending</a>
              <a role="tab" className={`tab ${tab === 'ongoing' ? 'tab-active' : ''}`} onClick={() => setTab('ongoing')}>Ongoing</a>
              <a role="tab" className={`tab ${tab === 'approved' ? 'tab-active' : ''}`} onClick={() => setTab('approved')}>Approved</a>
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
                {(isAccountabilityTab ? accountabilities.length === 0 : filteredRequests.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-base-content/60">
                      {isAccountabilityTab ? 'No accountabilities found' : 'No requests found'}
                    </td>
                  </tr>
                ) : isAccountabilityTab ? (
                  accountabilities.map((acc) => (
                    <tr key={acc.id} className="hover">
                      <td>
                        <div className="font-medium">{getAccountabilityPurpose(acc)}</div>
                        <div className="text-xs text-base-content/60">{getAccountabilityRequestedAt(acc)}</div>
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>
                        <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setShowAccountabilityModal(acc)}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredRequests.map((r) => (
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
                      <td>{getStatusBadge(r)}</td>
                      <td>
                        {((r.status || '').toString().toLowerCase() === 'pending') && (
                          <button 
                            className="btn btn-error btn-sm gap-1" 
                            disabled={busyId === r.id} 
                            onClick={() => handleCancel(r.id)}
                          >
                            {busyId === r.id ? <span className="loading loading-spinner loading-xs"></span> : <XCircle className="w-4 h-4" />}
                            Cancel
                          </button>
                        )}
                        {['approved', 'ongoing'].includes((r.status || '').toString().toLowerCase()) && (
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
                <div className="bg-base-300 p-2 rounded text-sm">{getStatusBadge(showModalRequest)}</div>
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

      {/* Accountability Details Modal */}
      {showAccountabilityModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowAccountabilityModal(null)}>
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg mb-4">Accountability Details</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Purpose</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{getAccountabilityPurpose(showAccountabilityModal)}</div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Reason / Notes</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{showAccountabilityModal.reason || 'Accountability'}</div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Requested</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{getAccountabilityRequestedAt(showAccountabilityModal) || '—'}</div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Due Date</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{showAccountabilityModal.due}</div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Details</span></label>
                <div className="bg-base-300 p-2 rounded text-sm whitespace-pre-wrap">
                  {formatAccountabilityDetails(showAccountabilityModal.details) || 'No details provided'}
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text text-xs">Status</span></label>
                <div className="bg-base-300 p-2 rounded text-sm">{getAccountabilityBadge(showAccountabilityModal.status)}</div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setShowAccountabilityModal(null)}>Close</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowAccountabilityModal(null)}>close</button>
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
    </>
  );
}
