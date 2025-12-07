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
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<Request | null>(null);

  // format a time string like "13:00" into "1:00 PM"; handle existing AM/PM
  const formatTime = (t: any) => {
    if (!t) return '';
    try {
      if (typeof t === 'string') {
        // If already contains am/pm marker, return trimmed
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
      // fallback: try creating a Date and using locale formatting
      const d = typeof t === 'string' || typeof t === 'number' ? new Date(t) : t;
      if (d && typeof d.toLocaleTimeString === 'function') {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    } catch (e) {
      // ignore and fallback to string
    }
    return String(t);
  }

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
      // desired order for "All" tab: approved -> ongoing/pending -> declined -> rejected -> cancelled
      const st = (s || '').toString().toLowerCase();
      if (st === 'approved') return 0;
      if (st === 'ongoing' || st === 'pending' || st === '') return 1;
      if (st === 'declined') return 2;
      if (st === 'rejected') return 3;
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
                <th>Purpose</th>
                <th>Date of Usage</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((req) => (
                <tr key={req.id}>
                  <td>{req.createdByName || req.createdBy || req.id}</td>
                  <td className="max-w-xs truncate">{req.purpose}</td>
                  <td>
                    {req.startDate} → {req.endDate}
                  </td>
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
                  <td>
                    <button className="btn btn-xs btn-primary" onClick={() => { setViewRequest(req); setViewOpen(true); }}>Show</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {viewOpen && viewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-base-100 p-4 rounded shadow max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold">Request Details</h3>
            {/* show request id for easier reference */}
            <div className="text-xs text-base-content/60 mt-2">Request ID</div>
            <div className="font-mono font-medium text-sm break-all">{viewRequest.id}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3 text-sm">
              <div>
                <div className="text-xs text-base-content/60">Requester</div>
                <div className="font-medium">{viewRequest.createdByName || viewRequest.createdBy || viewRequest.id}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">Requested At</div>
                <div className="font-medium">{(function formatTs(ts: any){ try { if (!ts) return ''; if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString(); if (typeof ts === 'string') return new Date(ts).toLocaleString(); if (ts instanceof Date) return ts.toLocaleString(); return String(ts) } catch { return '' } })(viewRequest.createdAt)}</div>
              </div>

              <div>
                <div className="text-xs text-base-content/60">Adviser / Leader</div>
                <div className="font-medium">{viewRequest.adviser}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">Status</div>
                <div className="font-medium">{viewRequest.status || 'Pending'}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-base-content/60">Purpose</div>
                <div className="font-medium">{viewRequest.purpose}</div>
              </div>

              <div>
                <div className="text-xs text-base-content/60">Start</div>
                <div className="font-medium">{viewRequest.startDate} {formatTime(viewRequest.start)}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">End</div>
                <div className="font-medium">{viewRequest.endDate} {formatTime(viewRequest.end)}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-base-content/60">Items</div>
                <ul className="list-disc list-inside mt-1">
                  {viewRequest.items?.map((item) => {
                    const equipment = equipmentList.find(e => e.equipmentID === item.equipmentID)
                    return (
                      <li key={item.equipmentID} className="text-sm">{equipment?.name || item.equipmentID} — {item.qty} pcs</li>
                    )
                  })}
                </ul>
                <div className="text-xs text-base-content/60 mt-2">Total Qty: <span className="font-medium">{(viewRequest.items || []).reduce((acc, i) => acc + (i.qty || 0), 0)}</span></div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-base-content/60">Admin Remarks</div>
                <div className="whitespace-pre-wrap font-medium">{viewRequest.declinedRemarks || (viewRequest as any).remarks || '—'}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {/* replicate approve/decline actions inside modal */}
              {((viewRequest.status || '').toString().toLowerCase() !== 'cancelled' && (viewRequest.status || '').toString().toLowerCase() !== 'approved' && (viewRequest.status || '').toString().toLowerCase() !== 'returned') ? (
                <>
                  <button
                    className="btn btn-success"
                    onClick={async () => {
                      try {
                        await updateStatus(viewRequest.id, 'Approved');
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setViewOpen(false);
                        setViewRequest(null);
                      }
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-error"
                    onClick={() => {
                      // open the decline modal prefilled for this request
                      setDeclineId(viewRequest.id);
                      setDeclineRemarks('');
                      setDeclineOpen(true);
                      setViewOpen(false);
                      setViewRequest(null);
                    }}
                  >
                    Decline
                  </button>
                </>
              ) : null}
              <button className="btn" onClick={() => { setViewOpen(false); setViewRequest(null); }}>Close</button>
            </div>
          </div>
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