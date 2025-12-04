import React, { useEffect, useState } from "react";
import AdminSidebar from "../../adminSidebar";
import { db } from "../../firebase";
import { collection, getDocs, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { logicEquipment } from "../equipment/logicEquipment";

interface RequestItem {
  equipmentID: string;
  qty: number;
}

interface Request {
  id: string;
  adviser: string;
  purpose: string;
  startDate: string;
  endDate: string;
  start: string;
  end: string;
  items: RequestItem[];
  createdAt: any;
  status?: string; // Pending / Approved / Declined
  createdBy?: string;
  createdByName?: string;
  declinedAt?: any;
  declinedRemarks?: string;
  approvedAt?: any;
  cancelledAt?: any;
}

const AdminDashboard: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all'|'pending'|'approved'|'declined'|'cancelled'>('all');
  const { equipmentList } = logicEquipment();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineRemarks, setDeclineRemarks] = useState('');

  const fetchRequests = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "requests"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Request[];

      // Resolve requester display names from users collection (if present)
      const uids = Array.from(new Set(data.map((d: any) => d.createdBy).filter(Boolean)));
      const userNameByUid: Record<string, string> = {};
      await Promise.all(uids.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const ud = userDoc.data() as any;
            userNameByUid[uid] = ud.displayName || ud.email || uid;
          }
        } catch (e) {
          console.warn('Failed to load user', uid, e);
        }
      }));

      const enriched = data.map(d => ({ ...d, createdByName: (d as any).createdBy ? (userNameByUid[(d as any).createdBy] || (d as any).createdBy) : undefined }));
      setRequests(enriched as Request[]);
      // setRequests(enriched as Request[]);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      // include timestamps for certain status transitions
      const updates: any = { status: newStatus };
      if (newStatus.toString().toLowerCase() === 'approved') {
        updates.approvedAt = serverTimestamp();
      }
      if (newStatus.toString().toLowerCase() === 'cancelled') {
        updates.cancelledAt = serverTimestamp();
      }

      await updateDoc(doc(db, "requests", id), updates);

      // Optimistically update local state. For timestamps, set a client-side Date so UI shows immediately;
      // the serverTimestamp will be written on the server and may differ when read back.
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: newStatus, approvedAt: updates.approvedAt ? new Date() : req.approvedAt, cancelledAt: updates.cancelledAt ? new Date() : req.cancelledAt } : req
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  async function confirmDecline() {
    if (!declineId) return;
    try {
      await updateDoc(doc(db, 'requests', declineId), {
        status: 'Declined',
        declinedAt: serverTimestamp(),
        declinedRemarks: declineRemarks || null,
      });
      setRequests(prev => prev.map(r => r.id === declineId ? { ...r, status: 'Declined', declinedRemarks: declineRemarks } : r));
    } catch (e) {
      console.error('Failed to decline request', e);
      alert('Failed to decline request; see console');
    } finally {
      setDeclineOpen(false);
      setDeclineId(null);
      setDeclineRemarks('');
    }
  }

  if (loading) return <p className="text-center mt-10">Loading requests...</p>;

  const visibleRequests = requests.filter((req) => {
    if (tab === 'all') return true;
    const s = (req.status || '').toString().toLowerCase();
    if (tab === 'pending') return s === 'pending' || s === 'ongoing' || s === '';
    if (tab === 'approved') return s === 'approved' || s === 'approved';
    if (tab === 'declined') return s === 'declined' || s === 'rejected';
    if (tab === 'cancelled') return s === 'cancelled';
    return true;
  });

  // when showing All, sort by status priority: ongoing -> approved -> declined -> cancelled
  let visible = visibleRequests;
  if (tab === 'all') {
    const priority = (s: string) => {
      // desired order: ongoing/pending -> approved -> returned -> declined/rejected -> cancelled
      const st = (s || '').toString().toLowerCase();
      if (st === 'ongoing' || st === 'pending' || st === '') return 0;
      if (st === 'approved') return 1;
      if (st === 'returned') return 2;
      if (st === 'declined' || st === 'rejected') return 3;
      if (st === 'cancelled') return 4;
      return 5;
    }
    const getTimeKey = (r: any) => {
      try {
        if (r.approvedAt && typeof r.approvedAt.toDate === 'function') return r.approvedAt.toDate().toISOString()
        if (r.returnedAt && typeof r.returnedAt.toDate === 'function') return r.returnedAt.toDate().toISOString()
        if (r.declinedAt && typeof r.declinedAt.toDate === 'function') return r.declinedAt.toDate().toISOString()
        if (r.cancelledAt && typeof r.cancelledAt.toDate === 'function') return r.cancelledAt.toDate().toISOString()
        if (r.createdAt && typeof r.createdAt.toDate === 'function') return r.createdAt.toDate().toISOString()
        if (r.createdAt) return new Date(r.createdAt).toISOString()
      } catch (e) {
        return ''
      }
      return ''
    }

    visible = visibleRequests.slice().sort((a,b) => {
      const pa = priority((a.status || '').toString())
      const pb = priority((b.status || '').toString())
      if (pa !== pb) return pa - pb
      const ta = getTimeKey(a) || ''
      const tb = getTimeKey(b) || ''
      // most recent first
      return tb.localeCompare(ta)
    })
  }

  return (
    <>
      <AdminSidebar />
      <div className="min-h-screen bg-base-100 p-6" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <h1 className="text-3xl font-bold mb-6">All Requests</h1>

      <div className="mb-4">
        <div className="tabs tabs-boxed">
          <a className={`tab ${tab === 'all' ? 'tab-active' : ''}`} onClick={() => setTab('all')}>All</a>
          <a className={`tab ${tab === 'pending' ? 'tab-active' : ''}`} onClick={() => setTab('pending')}>Pending</a>
          <a className={`tab ${tab === 'approved' ? 'tab-active' : ''}`} onClick={() => setTab('approved')}>Approved</a>
          <a className={`tab ${tab === 'declined' ? 'tab-active' : ''}`} onClick={() => setTab('declined')}>Declined</a>
          <a className={`tab ${tab === 'cancelled' ? 'tab-active' : ''}`} onClick={() => setTab('cancelled')}>Cancelled</a>
        </div>
      </div>

      {visibleRequests.length === 0 ? (
        <p>No requests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Requester</th>
                <th>Adviser / Leader</th>
                <th>Purpose</th>
                <th>Date of Usage</th>
                <th>Time</th>
                <th>Items</th>
                <th>Total Qty</th>
                <th>Requested At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
        <tbody>
              {visible.map((req) => (
                <tr key={req.id}>
                  <td>{req.createdByName || req.createdBy || req.id}</td>
                  <td>{req.adviser}</td>
                  <td>{req.purpose}</td>
                  <td>
                    {req.startDate} → {req.endDate}
                  </td>
                  <td>
                    {req.start} → {req.end}
                  </td>
                  <td>
                    <ul className="list-disc list-inside">
                      {req.items.map((item) => {
                        const equipment = equipmentList.find(
                          (e) => e.equipmentID === item.equipmentID
                        );
                        return (
                          <li key={item.equipmentID}>
                            {equipment?.name || item.equipmentID} — {item.qty} pcs
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td>{req.items.reduce((acc, i) => acc + i.qty, 0)}</td>
                  <td>{req.createdAt?.toDate?.().toLocaleString()}</td>
                  <td>
                    <span
                      className={`badge ${
                        (req.status || '').toString().toLowerCase() === 'approved'
                          ? 'badge-success'
                          : (req.status || '').toString().toLowerCase() === 'declined' || (req.status || '').toString().toLowerCase() === 'rejected'
                          ? 'badge-error'
                          : (req.status || '').toString().toLowerCase() === 'cancelled'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {req.status || 'Pending'}
                    </span>
                  </td>
                  <td className="flex gap-2 justify-center items-center align-middle">
                    {((req.status || '').toString().toLowerCase() !== 'cancelled' && (req.status || '').toString().toLowerCase() !== 'approved' && (req.status || '').toString().toLowerCase() !== 'returned') ? (
                      <>
                        <button
                          className="btn btn-xs btn-success"
                          disabled={(req.status || '').toString().toLowerCase() === 'approved'}
                          onClick={() => updateStatus(req.id, 'Approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-xs btn-error"
                          disabled={(req.status || '').toString().toLowerCase() === 'declined' || (req.status || '').toString().toLowerCase() === 'rejected'}
                          onClick={() => { setDeclineId(req.id); setDeclineRemarks(''); setDeclineOpen(true); }}
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-base-content/60">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Decline remarks modal */}
      {declineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-base-100 p-4 rounded shadow max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold">Decline Request</h3>
            <p className="text-sm text-base-content/70 mb-2">Provide remarks explaining why this request is declined (optional):</p>
            <textarea
              className="textarea textarea-bordered w-full mb-3"
              rows={5}
              value={declineRemarks}
              onChange={(e) => setDeclineRemarks(e.target.value)}
              placeholder="Enter remarks..."
            />
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => { setDeclineOpen(false); setDeclineId(null); setDeclineRemarks(''); }}>Cancel</button>
              <button className="btn btn-error" onClick={confirmDecline}>Confirm Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdminDashboard;