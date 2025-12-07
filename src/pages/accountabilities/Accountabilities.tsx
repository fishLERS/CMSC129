import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { AlertCircle, CheckCircle, Clock, FileWarning } from 'lucide-react'

export default function Accountabilities(){
  const { user } = useAuth()
  const [rows, setRows] = React.useState<any[]>([])
  const [tab, setTab] = React.useState<'all'|'pending'|'resolved'|'overdue'>('all');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [showModal, setShowModal] = React.useState<any | null>(null);

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
  let filtered = rows.filter(r => {
    if (tab === 'all') return true;
    const s = (r.status || 'pending').toLowerCase();
    if (tab === 'pending') return s === 'pending';
    if (tab === 'resolved') return s === 'resolved' || s === 'completed';
    if (tab === 'overdue') return s === 'overdue';
    return false;
  });

  // Count stats
  const pendingCount = rows.filter(r => (r.status || '').toLowerCase() === 'pending').length;
  const resolvedCount = rows.filter(r => ['resolved','completed'].includes((r.status || '').toLowerCase())).length;
  const overdueCount = rows.filter(r => (r.status || '').toLowerCase() === 'overdue').length;

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'resolved' || s === 'completed') return <span className="badge badge-success">Resolved</span>;
    if (s === 'pending') return <span className="badge badge-warning">Pending</span>;
    if (s === 'overdue') return <span className="badge badge-error">Overdue</span>;
    return <span className="badge badge-neutral">{status}</span>;
  };

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
            <div className="p-6 space-y-6">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Admin Accountabilities</h1>
                  <p className="text-base-content/70">Track and manage all accountabilities</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
                <div className="stat">
                  <div className="stat-title">Total</div>
                  <div className="stat-value">{rows.length}</div>
                  <div className="stat-desc">All accountabilities</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Pending</div>
                  <div className="stat-value text-warning">{pendingCount}</div>
                  <div className="stat-desc">Needs attention</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Resolved</div>
                  <div className="stat-value text-success">{resolvedCount}</div>
                  <div className="stat-desc">Completed</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Overdue</div>
                  <div className="stat-value text-error">{overdueCount}</div>
                  <div className="stat-desc">Past due</div>
                </div>
              </div>

              {/* Table Card */}
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body p-0">
                  {/* Tabs Header */}
                  <div className="p-4 border-b border-base-300">
                    <div role="tablist" className="tabs tabs-boxed bg-base-300">
                      <a role="tab" className={`tab ${tab === 'all' ? 'tab-active' : ''}`} onClick={() => setTab('all')}>All</a>
                      <a role="tab" className={`tab ${tab === 'pending' ? 'tab-active' : ''}`} onClick={() => setTab('pending')}>Pending</a>
                      <a role="tab" className={`tab ${tab === 'resolved' ? 'tab-active' : ''}`} onClick={() => setTab('resolved')}>Resolved</a>
                      <a role="tab" className={`tab ${tab === 'overdue' ? 'tab-active' : ''}`} onClick={() => setTab('overdue')}>Overdue</a>
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
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-base-content/60">
                              No accountabilities found
                            </td>
                          </tr>
                        ) : (
                          filtered.map((r) => (
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
                              <td>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(r)}>View</button>
                                {r.status?.toLowerCase() === 'pending' && (
                                  <button className="btn btn-success btn-sm ml-2" disabled={busyId === r.id} onClick={async () => {
                                    setBusyId(r.id);
                                    try {
                                      await import('firebase/firestore').then(({ updateDoc, doc }) =>
                                        updateDoc(doc(db, 'accountabilities', r.id), { status: 'resolved' })
                                      );
                                    } catch (e) { alert('Failed to mark resolved'); }
                                    setBusyId(null);
                                  }}>Mark as Resolved</button>
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

              {/* Details Modal */}
              {showModal && (
                <dialog className="modal modal-open">
                  <div className="modal-box max-w-lg">
                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowModal(null)}>
                      <AlertCircle className="w-4 h-4" />
                    </button>
                    <h3 className="font-bold text-lg mb-4">Accountability Details</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="form-control">
                        <label className="label"><span className="label-text text-xs">Due Date</span></label>
                        <div className="bg-base-300 p-2 rounded text-sm">{showModal.due || 'No date set'}</div>
                      </div>
                      <div className="form-control">
                        <label className="label"><span className="label-text text-xs">Details</span></label>
                        <div className="bg-base-300 p-2 rounded text-sm whitespace-pre-wrap">{showModal.details || 'No details provided'}</div>
                      </div>
                      <div className="form-control">
                        <label className="label"><span className="label-text text-xs">Status</span></label>
                        <div className="bg-base-300 p-2 rounded text-sm">{getStatusBadge(showModal.status)}</div>
                      </div>
                    </div>
                    <div className="modal-action">
                      <button className="btn" onClick={() => setShowModal(null)}>Close</button>
                      {showModal.status?.toLowerCase() === 'pending' && (
                        <button className="btn btn-success" disabled={busyId === showModal.id} onClick={async () => {
                          setBusyId(showModal.id);
                          try {
                            await import('firebase/firestore').then(({ updateDoc, doc }) =>
                              updateDoc(doc(db, 'accountabilities', showModal.id), { status: 'resolved' })
                            );
                          } catch (e) { alert('Failed to mark resolved'); }
                          setBusyId(null); setShowModal(null);
                        }}>Mark as Resolved</button>
                      )}
                    </div>
                  </div>
                  <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setShowModal(null)}>close</button>
                  </form>
                </dialog>
              )}

              {/* Info Alert */}
              {pendingCount > 0 && (
                <div className="alert alert-warning mt-6">
                  <AlertCircle className="w-5 h-5" />
                  <div>
                    <h3 className="font-bold">Attention Required</h3>
                    <div className="text-xs">You have {pendingCount} pending {pendingCount === 1 ? 'accountability' : 'accountabilities'} that need to be resolved.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
