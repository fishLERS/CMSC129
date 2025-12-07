import React from 'react';
import './home-student.css';
import { logicEquipment } from './equipment/logicEquipment';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, doc as docRef, updateDoc, serverTimestamp } from 'firebase/firestore';

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

  return (
    <div className="home-student min-h-screen bg-slate-900 text-slate-200">
  <div className="flex-1">
  <header className="hs-topbar w-full bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-base-content/70">Welcome, {user?.displayName ?? user?.email?.split('@')[0] ?? 'Student'}! Today is {formatDate(new Date())}</p>
            <h1 className="text-2xl font-semibold mt-1">Student Home</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <button className="btn btn-ghost btn-square btn-sm" onClick={toggleNotif} aria-haspopup="true" aria-expanded={notifOpen}>🔔</button>
            {recentNotifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full ring-1 ring-white"></span>
            )}

            {/* dropdown with up to 4 recent notifications */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-base-100 border border-base-300 rounded shadow z-50">
                <div className="p-2">
                  <div className="font-semibold">Notifications</div>
                </div>
                <div className="max-h-60 overflow-auto">
                  {recentNotifications.length === 0 ? (
                    // when there are no recent notifications, show up to 4 historic/combined notifications in compact "Purpose | Status" form
                    (notifications.length === 0) ? (
                      <div className="p-3 text-sm text-base-content/60">No new notifications</div>
                    ) : (
                      notifications.slice(0,4).map(n => (
                        <div
                          key={n.id}
                          className="p-3 border-t border-base-200 hover:bg-base-200/10 cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onClick={() => { try { localStorage.setItem('lastRequestId', n.id) } catch {} setNotifOpen(false); nav('/tracking') }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { try { localStorage.setItem('lastRequestId', n.id) } catch {} setNotifOpen(false); nav('/tracking') } }}
                        >
                          <div className="font-medium">{n.purpose || 'Request update'}</div>
                          <div className="text-xs text-base-content/60">{n.status}</div>
                        </div>
                      ))
                    )
                  ) : (
                    recentNotifications.slice(0,4).map(n => (
                      <div
                        key={n.id}
                        className="p-3 border-t border-base-200 hover:bg-base-200/10 cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => { try { localStorage.setItem('lastRequestId', n.id) } catch {} setNotifOpen(false); nav('/tracking') }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { try { localStorage.setItem('lastRequestId', n.id) } catch {} setNotifOpen(false); nav('/tracking') } }}
                      >
                        <div className="font-medium">{n.purpose || 'Request update'}</div>
                        <div className="text-xs text-base-content/60">{n.oldStatus} → {n.status}{n.actionAt ? ` · ${n.actionAt}` : ''}</div>
                        {n.adminRemarks && (
                          <div className="text-xs mt-1 text-base-content/60">Remarks: {n.adminRemarks}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-base-200 flex items-center justify-between">
                  <button className="btn btn-link btn-sm" onClick={() => { setNotifOpen(false); setNotifAllOpen(true); }}>View all</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setNotifOpen(false); }}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-0">
        <div className="w-full">
          <section className="card requests-card border border-base-300 rounded-md bg-base-100 flex flex-col">
            <div className="p-3 border-b border-base-300 flex items-center justify-between">
              <h2 className="font-medium">Requests</h2>
              <div className="tabs tabs-boxed">
                <a className={`tab ${tab==='all'?'tab-active':''}`} onClick={() => setTab('all')}>All</a>
                <a className={`tab ${tab==='ongoing'?'tab-active':''}`} onClick={() => setTab('ongoing')}>Ongoing</a>
                <a className={`tab ${tab==='completed'?'tab-active':''}`} onClick={() => setTab('completed')}>Completed</a>
                <a className={`tab ${tab==='rejected'?'tab-active':''}`} onClick={() => setTab('rejected')}>Rejected</a>
                <a className={`tab ${tab==='cancelled'?'tab-active':''}`} onClick={() => setTab('cancelled')}>Cancelled</a>
              </div>
            </div>
            <div className="card-body p-0 flex-1 min-h-0">
              <div className="overflow-x-auto w-full table-scroll">
                <table className="table w-full">
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
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="empty-state text-center text-base-content/60">No requests yet</td>
                      </tr>
                    )}
                    {filtered.map((r) => (
                      <tr key={r.id} className="align-top">
                        <td>
                          <div className="font-semibold">{r.purpose || 'Item Request'}</div>
                          <div className="text-xs text-base-content/60">Date Requested: {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : '')}</div>
                        </td>
                        <td>{Array.isArray(r.items) ? r.items.reduce((s:any,i:any)=>s+(i.qty||0),0) : '-'}</td>
                        <td>{(r.status || 'ongoing')}</td>
                        <td className="w-36">
                          {/* action buttons: Cancel for ongoing, Return for approved */}
                          {((r.status||'').toString().toLowerCase() === 'ongoing') && (
                            <button className="btn btn-sm btn-error" disabled={busyId===r.id} onClick={() => handleCancel(r.id)}>Cancel</button>
                          )}
                          {((r.status||'').toString().toLowerCase() === 'approved') && (
                            <button className="btn btn-sm btn-primary" disabled={busyId===r.id} onClick={() => handleReturn(r.id)}>Return</button>
                          )}
                        </td>
                        <td className="w-24">
                          <button className="btn btn-xs btn-primary" onClick={() => setShowModalRequest(r)}>Show</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
      {/* Show Request modal for student (admin-style layout) */}
      {showModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModalRequest(null)}>
          <div className="bg-base-100 p-4 rounded shadow max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Request Details</h3>
            {/* show request id for easier reference */}
            <div className="text-xs text-base-content/60 mt-2">Request ID</div>
            <div className="font-mono font-medium text-sm break-all">{showModalRequest.id}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3 text-sm">
              <div>
                <div className="text-xs text-base-content/60">Requester</div>
                <div className="font-medium">{showModalRequest.createdByName || showModalRequest.createdBy || showModalRequest.id}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">Requested At</div>
                <div className="font-medium">{(function formatTs(ts: any){ try { if (!ts) return ''; if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString(); if (typeof ts === 'string') return new Date(ts).toLocaleString(); if (ts instanceof Date) return ts.toLocaleString(); return String(ts) } catch { return '' } })(showModalRequest.createdAt)}</div>
              </div>

              <div>
                <div className="text-xs text-base-content/60">Adviser / Leader</div>
                <div className="font-medium">{showModalRequest.adviser}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">Status</div>
                <div className="font-medium">{showModalRequest.status || 'Pending'}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-base-content/60">Purpose</div>
                <div className="font-medium">{showModalRequest.purpose}</div>
              </div>

              <div>
                <div className="text-xs text-base-content/60">Start</div>
                <div className="font-medium">{showModalRequest.startDate} {formatTime(showModalRequest.start)}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">End</div>
                <div className="font-medium">{showModalRequest.endDate} {formatTime(showModalRequest.end)}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-base-content/60">Items</div>
                <ul className="list-disc list-inside mt-1">
                  {showModalRequest.items?.map((item: any) => {
                    const equipment = equipmentList.find((e:any) => e.equipmentID === item.equipmentID)
                    return (
                      <li key={item.equipmentID} className="text-sm">{equipment?.name || item.name || item.equipmentID} — {item.qty} pcs</li>
                    )
                  })}
                </ul>
                <div className="text-xs text-base-content/60 mt-2">Total Qty: <span className="font-medium">{(showModalRequest.items || []).reduce((acc:any, i:any) => acc + (i.qty || 0), 0)}</span></div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-base-content/60">Admin Remarks</div>
                <div className="whitespace-pre-wrap font-medium">{showModalRequest.declinedRemarks || showModalRequest.remarks || '—'}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setShowModalRequest(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* View all notifications modal */}
      {notifAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-base-100 p-4 rounded shadow max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">All Notifications</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setNotifAllOpen(false)}>Close</button>
            </div>
            <div className="divide-y divide-base-200">
              {notifications.length === 0 && (
                <div className="p-4 text-sm text-base-content/60">No notifications</div>
              )}
              {notifications.map(n => (
                <div key={n.id} className="p-3">
                  <div className="font-medium">{n.purpose || 'Request update'}</div>
                  <div className="text-xs text-base-content/60">{n.oldStatus} → {n.status}{n.actionAt ? ` · ${n.actionAt}` : ''}</div>
                  {n.adminRemarks && (
                    <div className="text-sm mt-1">Remarks: <div className="text-sm text-base-content/70 whitespace-pre-wrap">{n.adminRemarks}</div></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
