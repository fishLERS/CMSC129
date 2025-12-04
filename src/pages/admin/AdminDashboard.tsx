import React, { useEffect, useState } from "react";
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
      await updateDoc(doc(db, "requests", id), { status: newStatus });
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: newStatus } : req
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

  return (
    <div className="min-h-screen bg-base-100 p-6">
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
                <th>Status</th>
                <th>Actions</th>
                <th>Requested At</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((req) => (
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
                    {((req.status || '').toString().toLowerCase() !== 'cancelled' && (req.status || '').toString().toLowerCase() !== 'approved') ? (
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
                  <td>{req.createdAt?.toDate?.().toLocaleString()}</td>
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
  );
};

export default AdminDashboard;