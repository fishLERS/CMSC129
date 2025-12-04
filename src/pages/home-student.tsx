import React from 'react';
import './home-student.css';
import Sidebar from '../sidebar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function HomeStudent() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [tab, setTab] = React.useState<'all'|'ongoing'|'completed'|'rejected'>('all');

  React.useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }
  
    const q = query(
      collection(db, 'requests'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs: any[] = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setRequests(docs);
    });
    return () => unsub();
  }, [user]);

  const filtered = requests.filter(r => {
    if (tab === 'all') return true;
    const s = (r.status || 'ongoing').toLowerCase();
    return (tab === 'ongoing' && s === 'ongoing') || (tab === 'completed' && s === 'completed') || (tab === 'rejected' && s === 'rejected');
  });

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
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={3} className="empty-state text-center text-base-content/60">No requests yet</td>
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
