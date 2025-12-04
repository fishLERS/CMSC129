import React from 'react';
import './home-student.css';
import Sidebar from '../sidebar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, doc as docRef, updateDoc, serverTimestamp } from 'firebase/firestore';

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function HomeStudent() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [tab, setTab] = React.useState<'all'|'ongoing'|'completed'|'rejected'|'cancelled'>('all');

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

  // When showing "All", place ongoing requests first while keeping the recent-first order inside groups
  if (tab === 'all') {
    filtered = filtered.slice().sort((a,b) => {
      const sa = (a.status || 'ongoing').toString().toLowerCase();
      const sb = (b.status || 'ongoing').toString().toLowerCase();
      const aIsOngoing = sa === 'ongoing';
      const bIsOngoing = sb === 'ongoing';
      if (aIsOngoing && !bIsOngoing) return -1;
      if (!aIsOngoing && bIsOngoing) return 1;
      // fallback to existing sortKey ordering (most recent first)
      const ka = a.sortKey || '';
      const kb = b.sortKey || '';
      return kb.localeCompare(ka);
    });
  }

  const [busyId, setBusyId] = React.useState<string | null>(null)

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

  const nav = useNavigate();

  return (
    <div className="home-student min-h-screen bg-slate-900 text-slate-200">
      <Sidebar />
  <div className="flex-1" style={{ marginLeft: 'var(--sidebar-width)' }}>
  <header className="hs-topbar w-full bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-base-content/70">Welcome, {user?.displayName ?? user?.email?.split('@')[0] ?? 'Student'}! Today is {formatDate(new Date())}</p>
            <h1 className="text-2xl font-semibold mt-1">Student Home</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-square btn-sm">🔔</button>
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
                      </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={4} className="empty-state text-center text-base-content/60">No requests yet</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
      </div>
    </div>
  );
}
