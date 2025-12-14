import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { logicEquipment } from "../equipment/logicEquipment";
import { Eye } from "lucide-react";
import LoadingOverlay from "../../components/LoadingOverlay";

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
  returnedAt?: any;
  returnCondition?: "functional" | "damaged" | "missing";
  clearedAt?: any;
}

const AdminDashboard: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all'|'pending'|'approved'|'declined'|'cancelled'|'returned'|'cleared'>('all');
  const { equipmentList, isLoading: isEquipmentLoading } = logicEquipment();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineRemarks, setDeclineRemarks] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<Request | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isFinalizingReturn, setIsFinalizingReturn] = useState(false);

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

  const pendingCount = requests.filter(
    (r) => (r.status || "").toLowerCase() === "pending"
  ).length;
  const approvedCount = requests.filter(
    (r) => (r.status || "").toLowerCase() === "approved"
  ).length;
  const declinedCount = requests.filter((r) =>
    ["declined", "rejected"].includes((r.status || "").toLowerCase())
  ).length;
  const cancelledCount = requests.filter(
    (r) => (r.status || "").toLowerCase() === "cancelled"
  ).length;
  const returnedCount = requests.filter(
    (r) => (r.status || "").toLowerCase() === "returned"
  ).length;
  const clearedCount = requests.filter(
    (r) => (r.status || "").toLowerCase() === "cleared"
  ).length;

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
      setAlertMessage("Failed to update status. Please try again.");
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
      setAlertMessage('Failed to decline request. Please try again.');
    } finally {
      setDeclineOpen(false);
      setDeclineId(null);
      setDeclineRemarks('');
    }
  }

  const finalizeReturnCondition = async (
    request: Request,
    condition: "functional" | "damaged" | "missing"
  ) => {
    if (!request?.id) return;
    try {
      setIsFinalizingReturn(true);
      await updateDoc(doc(db, "requests", request.id), {
        status: "cleared",
        returnCondition: condition,
        clearedAt: serverTimestamp(),
      });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: "cleared",
                returnCondition: condition,
                clearedAt: new Date(),
              }
            : r
        )
      );
      setAlertMessage(
        condition === "functional"
          ? "Return cleared as functional."
          : condition === "damaged"
          ? "Return recorded as damaged."
          : "Return recorded as missing."
      );
      setViewOpen(false);
      setViewRequest(null);
    } catch (e) {
      console.error("Failed to finalize return status", e);
      setAlertMessage("Failed to log the return condition. Please try again.");
    } finally {
      setIsFinalizingReturn(false);
    }
  };

  const visibleRequests = requests.filter((req) => {
    if (tab === 'all') return true;
    const s = (req.status || '').toString().toLowerCase();
    if (tab === 'pending') return s === 'pending' || s === 'ongoing' || s === '';
    if (tab === 'approved') return s === 'approved' || s === 'approved';
    if (tab === 'declined') return s === 'declined' || s === 'rejected';
    if (tab === 'cancelled') return s === 'cancelled';
    if (tab === 'returned') return s === 'returned';
    if (tab === 'cleared') return s === 'cleared';
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
      if (st === 'returned') return 2;
      if (st === 'cleared') return 3;
      if (st === 'declined') return 4;
      if (st === 'rejected') return 5;
      if (st === 'cancelled') return 6;
      return 7;
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

  const normalizedViewStatus = (viewRequest?.status || "").toString().toLowerCase();
  const requiresReturnAssessment = normalizedViewStatus === "returned";
  const showApprovalActions =
    !!viewRequest &&
    !["cancelled", "approved", "returned", "cleared"].includes(
      normalizedViewStatus
    );

  return (
    <>
      <LoadingOverlay show={loading || isEquipmentLoading} message="Loading requests..." />
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
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-base-content/70">Manage and review equipment requests.</p>
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
          <div className="stat-value text-warning">{pendingCount}</div>
          <div className="stat-desc">Awaiting approval</div>
        </div>
        <div className="stat">
          <div className="stat-title">Approved</div>
          <div className="stat-value text-success">{approvedCount}</div>
          <div className="stat-desc">Ready for use</div>
        </div>
        <div className="stat">
          <div className="stat-title">Returned</div>
          <div className="stat-value text-info">{returnedCount}</div>
          <div className="stat-desc">Needs inspection</div>
        </div>
        <div className="stat">
          <div className="stat-title">Cleared</div>
          <div className="stat-value text-secondary">{clearedCount}</div>
          <div className="stat-desc">Reviewed returns</div>
        </div>
        <div className="stat">
          <div className="stat-title">Declined</div>
          <div className="stat-value text-error">{declinedCount}</div>
          <div className="stat-desc">Requests declined</div>
        </div>
        <div className="stat">
          <div className="stat-title">Cancelled</div>
          <div className="stat-value text-base">{cancelledCount}</div>
          <div className="stat-desc">Requests cancelled</div>
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
              <a role="tab" className={`tab ${tab === 'approved' ? 'tab-active' : ''}`} onClick={() => setTab('approved')}>Approved</a>
              <a role="tab" className={`tab ${tab === 'declined' ? 'tab-active' : ''}`} onClick={() => setTab('declined')}>Declined</a>
              <a role="tab" className={`tab ${tab === 'cancelled' ? 'tab-active' : ''}`} onClick={() => setTab('cancelled')}>Cancelled</a>
              <a role="tab" className={`tab ${tab === 'returned' ? 'tab-active' : ''}`} onClick={() => setTab('returned')}>Returned</a>
              <a role="tab" className={`tab ${tab === 'cleared' ? 'tab-active' : ''}`} onClick={() => setTab('cleared')}>Cleared</a>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table">
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
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-base-content/60">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  visible.map((req) => (
                    <tr key={req.id} className="hover">
                      <td>{req.createdByName || req.createdBy || req.id}</td>
                      <td className="max-w-xs truncate">{req.purpose}</td>
                      <td>{req.startDate} → {req.endDate}</td>
                      <td>
                        <span className={`badge ${
                          (req.status || '').toString().toLowerCase() === 'approved'
                            ? 'badge-success'
                            : (req.status || '').toString().toLowerCase() === 'returned'
                            ? 'badge-info'
                            : (req.status || '').toString().toLowerCase() === 'cleared'
                            ? 'badge-secondary'
                            : (req.status || '').toString().toLowerCase() === 'declined' || (req.status || '').toString().toLowerCase() === 'rejected'
                            ? 'badge-error'
                            : (req.status || '').toString().toLowerCase() === 'cancelled'
                            ? 'badge-info'
                            : 'badge-warning'
                        }`}>
                          {req.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm btn-circle" onClick={() => { setViewRequest(req); setViewOpen(true); }}>
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
      {viewOpen && viewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-base-100 p-4 rounded shadow max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold">Request Details</h3>
            <div className="space-y-1 mt-2">
              <p className="text-xs uppercase tracking-wide text-base-content/60">Purpose</p>
              <p className="text-2xl font-bold break-words">{viewRequest.purpose || "Untitled Request"}</p>
              <p className="text-sm text-base-content/70">
                {viewRequest.createdByName || viewRequest.createdBy || "Unknown"} •{" "}
                {(function formatTs(ts: any){
                  try {
                    if (!ts) return '';
                    if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
                    if (typeof ts === 'string') return new Date(ts).toLocaleString();
                    if (ts instanceof Date) return ts.toLocaleString();
                    return String(ts);
                  } catch {
                    return '';
                  }
                })(viewRequest.createdAt)}
              </p>
              <p className="text-xs text-base-content/60 font-mono">ID: {viewRequest.id}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-sm">
              <div>
                <div className="text-xs text-base-content/60">Adviser / Leader</div>
                <div className="font-medium">{viewRequest.adviser}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">Status</div>
                <div className="font-medium capitalize">{viewRequest.status || 'Pending'}</div>
                {viewRequest.returnCondition && (
                  <>
                    <div className="text-xs text-base-content/60 mt-2">Return condition</div>
                    <div className="font-semibold capitalize">{viewRequest.returnCondition}</div>
                  </>
                )}
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
            <div className="flex flex-col gap-3">
              {requiresReturnAssessment ? (
                <div className="space-y-2">
                  <p className="text-sm text-base-content/70">
                    Confirm the condition of the returned items to clear this request.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-success"
                      disabled={isFinalizingReturn}
                      onClick={() => finalizeReturnCondition(viewRequest, "functional")}
                    >
                      {isFinalizingReturn ? "Saving..." : "Functional"}
                    </button>
                    <button
                      className="btn btn-warning"
                      disabled={isFinalizingReturn}
                      onClick={() => finalizeReturnCondition(viewRequest, "damaged")}
                    >
                      {isFinalizingReturn ? "Saving..." : "Damaged"}
                    </button>
                    <button
                      className="btn btn-error"
                      disabled={isFinalizingReturn}
                      onClick={() => finalizeReturnCondition(viewRequest, "missing")}
                    >
                      {isFinalizingReturn ? "Saving..." : "Missing"}
                    </button>
                  </div>
                </div>
              ) : showApprovalActions ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-success"
                    onClick={async () => {
                      try {
                        await updateStatus(viewRequest.id, 'approved');
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
                      setDeclineId(viewRequest.id);
                      setDeclineRemarks('');
                      setDeclineOpen(true);
                      setViewOpen(false);
                      setViewRequest(null);
                    }}
                  >
                    Decline
                  </button>
                </div>
              ) : null}
              <div className="flex justify-end">
                <button className="btn" onClick={() => { if (!isFinalizingReturn) { setViewOpen(false); setViewRequest(null); } }} disabled={isFinalizingReturn}>
                  Close
                </button>
              </div>
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
