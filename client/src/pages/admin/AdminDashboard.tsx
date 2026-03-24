import React, { useCallback, useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, getDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { Bell, Eye, X } from "lucide-react";
import { logicEquipment } from "../equipment/logicEquipment";
import LoadingOverlay from "../../components/LoadingOverlay";
import { overrideApproveRequest, overrideRejectRequest } from "../../api/requests.api";
import { useAuth } from "../../hooks/useAuth";

type ItemCondition = "functional" | "damaged" | "missing" | "consumed";

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
  clearedAt?: any;
  returnCondition?: ItemCondition;
  returnConditionSummary?: { functional: number; damaged: number; missing: number; consumed: number };
  returnAssessment?: Array<{ equipmentID?: string; index: number; condition: ItemCondition }>;
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
  const { isSuperAdmin } = useAuth();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [overrideAction, setOverrideAction] = useState<"approve" | "reject" | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [isFinalizingReturn, setIsFinalizingReturn] = useState(false);
  const [returnAssessments, setReturnAssessments] = useState<
    Record<string, (ItemCondition | null)[]>
  >({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifAllOpen, setNotifAllOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<any>>([]);
  const [recentNotifications, setRecentNotifications] = useState<Array<any>>([]);
  const [highlightRequestId, setHighlightRequestId] = useState<string | null>(null);
  const highlightTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const userNameCacheRef = React.useRef<Record<string, string>>({});

  const closeRequestModal = useCallback(() => {
    if (isFinalizingReturn) return;
    setViewOpen(false);
    setViewRequest(null);
  }, [isFinalizingReturn]);

  const getItemKey = (item: RequestItem, index: number) =>
    `${item.equipmentID || "item"}-${index}`;

  const equipmentLookup = React.useMemo(() => {
    const map: Record<
      string,
      { name?: string; isDisposable?: boolean }
    > = {};
    equipmentList.forEach((item) => {
      if (item.equipmentID) {
        map[item.equipmentID] = {
          name: item.name,
          isDisposable: item.isDisposable,
        };
      }
    });
    return map;
  }, [equipmentList]);

  const groupedReturnAssessments = React.useMemo(() => {
    if (!viewRequest?.returnAssessment) return null;
    const groups: Record<
      string,
      { equipmentID?: string; name?: string; functional: number; damaged: number; missing: number; consumed: number }
    > = {};

    viewRequest.returnAssessment.forEach((entry) => {
      const key = entry.equipmentID || "unknown";
      if (!groups[key]) {
        groups[key] = {
          equipmentID: entry.equipmentID,
          name: equipmentLookup[entry.equipmentID || ""]?.name || entry.equipmentID || "Unknown item",
          functional: 0,
          damaged: 0,
          missing: 0,
          consumed: 0,
        };
      }
      groups[key][entry.condition] = (groups[key][entry.condition] || 0) + 1;
    });

    return Object.values(groups);
  }, [viewRequest, equipmentLookup]);

  const normalizedViewStatus = (viewRequest?.status || "").toString().toLowerCase();
  const hasDurableItems = React.useMemo(() => {
    if (!viewRequest?.items) return false;
    return viewRequest.items.some((item) => {
      const lookup = equipmentLookup[item.equipmentID || ""];
      return !lookup?.isDisposable && (item.qty || 0) > 0;
    });
  }, [viewRequest, equipmentLookup]);
  const requiresReturnAssessment =
    !!viewRequest && normalizedViewStatus === "returned" && hasDurableItems;
  const showApprovalActions =
    !!viewRequest && !["cancelled", "approved", "returned", "cleared"].includes(normalizedViewStatus);
  const canOverrideToApprove =
    !!viewRequest && isSuperAdmin && ["declined", "rejected"].includes(normalizedViewStatus);
  const canOverrideToReject =
    !!viewRequest && isSuperAdmin && normalizedViewStatus === "approved";
  const assessmentsReady =
    !requiresReturnAssessment ||
    (viewRequest?.items || []).every((item, idx) => {
      const lookup = equipmentLookup[item.equipmentID || ""];
      if (lookup?.isDisposable) return true;
      const key = getItemKey(item, idx);
      const qty = Math.max(0, Number(item.qty) || 0);
      const values = returnAssessments[key] || [];
      return values.length >= qty && values.every((val) => val !== null);
    });

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

  const formatDateTime = (value: any) => {
    if (!value) return '';
    try {
      if (typeof value?.toDate === 'function') return value.toDate().toLocaleString();
      if (typeof value === 'string' || typeof value === 'number') return new Date(value).toLocaleString();
      if (value instanceof Date) return value.toLocaleString();
    } catch (e) {
      // ignore
    }
    return '';
  }

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, async (snap) => {
      try {
        const data = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Request[];

        const uids = Array.from(new Set(data.map((d: any) => d.createdBy).filter(Boolean)));
        const missingUids = uids.filter((uid) => !userNameCacheRef.current[uid]);
        if (missingUids.length > 0) {
          await Promise.all(
            missingUids.map(async (uid) => {
              try {
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                  const ud = userDoc.data() as any;
                  userNameCacheRef.current[uid] = ud.displayName || ud.email || uid;
                } else {
                  userNameCacheRef.current[uid] = uid;
                }
              } catch (e) {
                console.warn("Failed to load user", uid, e);
                userNameCacheRef.current[uid] = uid;
              }
            })
          );
        }

        const enriched = data.map((d) => ({
          ...d,
          createdByName: (d as any).createdBy
            ? userNameCacheRef.current[(d as any).createdBy] || (d as any).createdBy
            : undefined,
        }));
        setRequests(enriched as Request[]);
      } catch (error) {
        console.error("Error processing requests snapshot:", error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("AdminDashboard requests snapshot error", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!viewOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRequestModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewOpen, closeRequestModal]);

  useEffect(() => {
    if (
      !viewRequest ||
      (viewRequest.status || "").toLowerCase() !== "returned" ||
      !hasDurableItems
    ) {
      setReturnAssessments({});
      return;
    }
    setReturnAssessments((prev) => {
      const next: Record<string, (ItemCondition | null)[]> = {};
      (viewRequest.items || []).forEach((item, idx) => {
        const lookup = equipmentLookup[item.equipmentID || ""];
        if (lookup?.isDisposable) return;
        const key = getItemKey(item, idx);
        const qty = Math.max(0, Number(item.qty) || 0);
        const existing = prev[key] || [];
        next[key] = Array.from({ length: qty }, (_, pieceIdx) => existing[pieceIdx] ?? null);
      });
      return next;
    });
  }, [viewRequest, equipmentLookup, hasDurableItems]);

  useEffect(() => {
    if (!requests.length) {
      setRecentNotifications([]);
      setNotifications([]);
      return;
    }
    try {
      const storedRaw = localStorage.getItem("adminSeenRequestStatuses");
      const historyRaw = localStorage.getItem("adminNotificationHistory");
      let history: any[] = [];
      try {
        const parsed = JSON.parse(historyRaw || "[]");
        if (Array.isArray(parsed)) history = parsed;
      } catch {
        history = [];
      }
      const historyKeys = new Set(
        history.map((entry) => `${entry.type}-${entry.id}`)
      );

      const makeEntry = (req: Request, type: "new" | "returned") => {
        const purpose = req.purpose || "Equipment request";
        const requester = req.createdByName || req.createdBy || "Student";
        const actionAt =
          type === "returned"
            ? formatDateTime(req.returnedAt)
            : formatDateTime(req.createdAt);
        return {
          id: req.id,
          type,
          purpose,
          requester,
          actionAt,
          timestamp: Date.now(),
        };
      };

      const seedHistory = () => {
        const initialEntries = requests.map((req) => makeEntry(req, (req.status || "").toLowerCase() === "returned" ? "returned" : "new"));
        const unique = new Map<string, any>();
        [...history, ...initialEntries].forEach(entry => {
          const key = `${entry.type}-${entry.id}`;
          if (!unique.has(key)) unique.set(key, entry);
        });
        const combined = Array.from(unique.values()).slice(-200);
        localStorage.setItem("adminNotificationHistory", JSON.stringify(combined));
        return combined;
      };

      if (!storedRaw) {
        const initialMap: Record<string, string> = {};
        requests.forEach((req) => {
          initialMap[req.id] = (req.status || "pending").toString();
        });
        localStorage.setItem("adminSeenRequestStatuses", JSON.stringify(initialMap));
        const combined = seedHistory();
        setRecentNotifications([]);
        setNotifications(combined.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
        return;
      }

      const stored: Record<string, string> = JSON.parse(storedRaw || "{}");
      if (!history.length) {
        history = seedHistory();
      }
      const changes: Array<any> = [];
      requests.forEach((req) => {
        const now = (req.status || "pending").toString();
        const prev = stored[req.id];
        if (typeof prev === "undefined" && !historyKeys.has(`new-${req.id}`)) {
          const entry = makeEntry(req, "new");
          changes.push(entry);
          historyKeys.add(`new-${req.id}`);
        } else if (prev !== now && now.toLowerCase() === "returned" && !historyKeys.has(`returned-${req.id}`)) {
          const entry = makeEntry(req, "returned");
          changes.push(entry);
          historyKeys.add(`returned-${req.id}`);
        }
      });

      let updatedHistory = history;
      if (changes.length) {
        updatedHistory = [...history, ...changes].slice(-200);
        localStorage.setItem("adminNotificationHistory", JSON.stringify(updatedHistory));
      }

      setRecentNotifications(changes);
      setNotifications(updatedHistory.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    } catch (e) {
      console.warn("Failed to process admin notifications", e);
      setRecentNotifications([]);
      setNotifications([]);
    }
  }, [requests]);

  const markNotificationsSeen = React.useCallback(() => {
    try {
      const map: Record<string, string> = {};
      requests.forEach((req) => {
        map[req.id] = (req.status || "pending").toString();
      });
      localStorage.setItem("adminSeenRequestStatuses", JSON.stringify(map));
      setRecentNotifications([]);
    } catch (e) {
      console.warn("Failed to mark admin notifications seen", e);
    }
  }, [requests]);

  const toggleNotif = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) markNotificationsSeen();
  };

  const focusRequestRow = React.useCallback((requestId: string) => {
    if (!requestId) return;
    setTab('all');
    setHighlightRequestId(requestId);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightRequestId(null), 1200);
    requestAnimationFrame(() => {
      const el = document.getElementById(`request-row-${requestId}`);
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const handleAssessmentChange = (
    key: string,
    index: number,
    condition: ItemCondition
  ) => {
    setReturnAssessments((prev) => {
      if (!prev[key]) return prev;
      const entry = [...prev[key]];
      entry[index] = condition;
      return { ...prev, [key]: entry };
    });
  };

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

  async function confirmOverride() {
    if (!overrideId || !overrideAction) return;
    if (overrideAction === "reject" && !overrideReason.trim()) {
      setAlertMessage("Override reason is required to reject an approved request.");
      return;
    }

    try {
      setOverrideSubmitting(true);

      if (overrideAction === "approve") {
        await overrideApproveRequest(overrideId, overrideReason.trim() || undefined);
        setRequests((prev) =>
          prev.map((r) => (r.id === overrideId ? { ...r, status: "approved" } : r))
        );
        setAlertMessage("Decision overridden to Approved.");
      } else {
        await overrideRejectRequest(overrideId, overrideReason.trim());
        setRequests((prev) =>
          prev.map((r) =>
            r.id === overrideId
              ? { ...r, status: "rejected", declinedRemarks: overrideReason.trim() }
              : r
          )
        );
        setAlertMessage("Decision overridden to Rejected.");
      }
    } catch (error: any) {
      console.error("Failed to override decision", error);
      setAlertMessage(error?.message || "Failed to override decision. Please try again.");
    } finally {
      setOverrideSubmitting(false);
      setOverrideOpen(false);
      setOverrideId(null);
      setOverrideAction(null);
      setOverrideReason("");
    }
  }

  const finalizeReturnAssessment = async (request: Request) => {
    if (!request?.id) return;
    try {
      setIsFinalizingReturn(true);
      const summary = { functional: 0, damaged: 0, missing: 0, consumed: 0 };
      const assessmentRecords: NonNullable<Request["returnAssessment"]> = [];
      const issueMap: Record<
        string,
        { equipmentID?: string; equipmentName?: string; damaged: number; missing: number }
      > = {};

      (request.items || []).forEach((item, idx) => {
        const key = getItemKey(item, idx);
        const qty = Math.max(0, Number(item.qty) || 0);
        const lookup = equipmentLookup[item.equipmentID || ""] || {};
        const values = returnAssessments[key] || [];
        for (let pieceIdx = 0; pieceIdx < qty; pieceIdx++) {
          const condition: ItemCondition =
            lookup.isDisposable ? "consumed" : (values[pieceIdx] ?? "functional");
          summary[condition] = (summary[condition] || 0) + 1;
          assessmentRecords.push({
            equipmentID: item.equipmentID,
            index: pieceIdx,
            condition,
          });
          const needsIssueEntry =
            !lookup.isDisposable && (condition === "damaged" || condition === "missing");
          if (needsIssueEntry) {
            const issueKey = item.equipmentID || key;
            if (!issueMap[issueKey]) {
              const equipmentName = lookup.name || item.equipmentID;
              issueMap[issueKey] = {
                equipmentID: item.equipmentID,
                equipmentName,
                damaged: 0,
                missing: 0,
              };
            }
            issueMap[issueKey][condition] += 1;
          }
        }
      });

      const finalCondition =
        summary.missing > 0
          ? "missing"
          : summary.damaged > 0
          ? "damaged"
          : summary.functional > 0
          ? "functional"
          : summary.consumed > 0
          ? "consumed"
          : "functional";

      await updateDoc(doc(db, "requests", request.id), {
        status: "cleared",
        returnCondition: finalCondition,
        returnConditionSummary: summary,
        returnAssessment: assessmentRecords,
        clearedAt: serverTimestamp(),
      });

      const issues = Object.values(issueMap).filter(
        (entry) => entry.damaged > 0 || entry.missing > 0
      );
      if (issues.length > 0) {
        const issueDescriptions = issues.map((entry) => {
          const parts: string[] = [];
          if (entry.damaged > 0) parts.push(`${entry.damaged} damaged`);
          if (entry.missing > 0) parts.push(`${entry.missing} missing`);
          const label = entry.equipmentName || entry.equipmentID || "Item";
          return `${label}: ${parts.join(", ")}`;
        });
        const details = issueDescriptions.join("\n");
        await addDoc(collection(db, "accountabilities"), {
          requestId: request.id,
          createdBy: request.createdBy,
          createdByName: request.createdByName || request.createdBy,
          purpose: request.purpose || '',
          issues,
          details,
          status: "pending",
          reason: "Return inspection issues",
          dueDate: new Date().toISOString(),
          createdAt: serverTimestamp(),
        });
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: "cleared",
                returnCondition: finalCondition,
                returnConditionSummary: summary,
                returnAssessment: assessmentRecords,
                clearedAt: new Date(),
              }
            : r
        )
      );
      setAlertMessage(
        issues.length === 0
          ? "Return cleared."
          : "Return issues recorded and accountability created."
      );
      setReturnAssessments({});
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
        <div className="relative">
          <button className="btn btn-ghost btn-circle" onClick={toggleNotif}>
            <div className="indicator">
              <Bell className="w-5 h-5" />
              {recentNotifications.length > 0 && (
                <span className="indicator-item badge badge-error badge-xs" />
              )}
            </div>
          </button>
          {notifOpen && (
            <>
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
                      <div className="p-4 text-center text-base-content/60">No notifications</div>
                    ) : (
                    notifications
                      .filter((_, idx) => idx < 4)
                      .map((n) => (
                        <div
                          key={`${n.type}-${n.id}`}
                          className="p-3 hover:bg-primary/5 transition-colors cursor-pointer"
                          onClick={() => {
                            setNotifOpen(false);
                            focusRequestRow(n.id);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`badge badge-xs ${n.type === 'new' ? 'badge-primary' : 'badge-info'}`}>
                              {n.type === 'new' ? 'New' : 'Returned'}
                            </span>
                            <span className="font-medium text-sm">{n.purpose}</span>
                          </div>
                          <div className="text-xs text-base-content/70 mt-1">
                            {n.type === 'new' ? `Submitted by ${n.requester}` : `Marked returned by ${n.requester}`}
                            {n.actionAt ? ` • ${n.actionAt}` : ''}
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    recentNotifications.slice(0, 4).map((n) => (
                      <div
                        key={`${n.type}-${n.id}`}
                        className="p-3 hover:bg-primary/5 transition-colors bg-warning/5 cursor-pointer"
                        onClick={() => {
                          setNotifOpen(false);
                          focusRequestRow(n.id);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="badge badge-warning badge-xs">New</span>
                          <span className="font-medium text-sm">{n.purpose}</span>
                        </div>
                        <div className="text-xs text-base-content/70 mt-1">
                          {n.type === 'new' ? `Submitted by ${n.requester}` : `Marked returned by ${n.requester}`}
                          {n.actionAt ? ` • ${n.actionAt}` : ''}
                        </div>
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
          <div className="stat-value text-info">{cancelledCount}</div>
          <div className="stat-desc">Requests cancelled</div>
        </div>
      </div>

      {/* Requests Table Card */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-0">
          {/* Tabs Header */}
          <div className="p-4 border-b border-base-300">
            <div role="tablist" className="tabs tabs-boxed bg-base-300">
              <a role="tab" className={`tab transition-all duration-300 ease-in-out ${tab === 'all' ? 'tab-active bg-primary text-white font-semibold' : ''}`} onClick={() => setTab('all')}>All</a>
              <a role="tab" className={`tab transition-all duration-300 ease-in-out ${tab === 'pending' ? 'tab-active bg-primary text-white font-semibold' : ''}`} onClick={() => setTab('pending')}>Pending</a>
              <a role="tab" className={`tab transition-all duration-300 ease-in-out ${tab === 'approved' ? 'tab-active bg-primary text-white font-semibold' : ''}`} onClick={() => setTab('approved')}>Approved</a>
              <a role="tab" className={`tab transition-all duration-300 ease-in-out ${tab === 'declined' ? 'tab-active bg-primary text-white font-semibold' : ''}`} onClick={() => setTab('declined')}>Declined</a>
              <a role="tab" className={`tab transition-all duration-300 ease-in-out ${tab === 'cancelled' ? 'tab-active bg-primary text-white font-semibold' : ''}`} onClick={() => setTab('cancelled')}>Cancelled</a>
              <a role="tab" className={`tab transition-all duration-300 ease-in-out ${tab === 'returned' ? 'tab-active bg-primary text-white font-semibold' : ''}`} onClick={() => setTab('returned')}>Returned</a>
              <a role="tab" className={`tab transition-all duration-300 ease-in-out ${tab === 'cleared' ? 'tab-active bg-primary text-white font-semibold' : ''}`} onClick={() => setTab('cleared')}>Cleared</a>
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
                    <tr
                      key={req.id}
                      id={`request-row-${req.id}`}
                      className={`hover ${highlightRequestId === req.id ? 'bg-primary/10 ring-2 ring-primary/40' : ''}`}
                    >
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRequestModal();
          }}
        >
          <div
            className="bg-base-100 p-4 rounded shadow max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              onClick={closeRequestModal}
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold pr-10">Request Details</h3>
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
                {isSuperAdmin && (
                  <div className="mt-2">
                    <span className="badge badge-secondary badge-sm">Super Admin</span>
                  </div>
                )}
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

              <div className="md:col-span-2 space-y-2">
                <div className="text-xs text-base-content/60">Items</div>
                {requiresReturnAssessment ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="table w-full text-sm">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Condition per piece</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewRequest.items?.map((item, idx) => {
                            const key = getItemKey(item, idx);
                            const qty = Math.max(0, Number(item.qty) || 0);
                            const lookup = equipmentLookup[item.equipmentID || ""];
                            const itemName =
                              lookup?.name ||
                              equipmentList.find((eq) => eq.equipmentID === item.equipmentID)?.name ||
                              item.equipmentID;
                            const isDisposable = lookup?.isDisposable;
                            if (isDisposable) {
                              return (
                                <tr key={key}>
                                  <td>
                                    <div className="font-medium">{itemName}</div>
                                    <div className="text-xs text-base-content/60">ID: {item.equipmentID || "—"}</div>
                                  </td>
                                  <td>{qty}</td>
                                  <td></td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={key}>
                                <td>
                                  <div className="font-medium">{itemName}</div>
                                  <div className="text-xs text-base-content/60">
                                    ID: {item.equipmentID || "—"}
                                  </div>
                                </td>
                                <td>{qty}</td>
                                <td>
                                  <div className="flex flex-wrap gap-2">
                                    {Array.from({ length: qty }).map((_, pieceIdx) => {
                                      const value = (returnAssessments[key] || [])[pieceIdx];
                                      const buttonClass = (condition: ItemCondition) => {
                                        // DaisyUI color classes for each condition
                                        let palette = "";
                                        switch (condition) {
                                          case "functional":
                                            palette = "btn-success"; // green
                                            break;
                                          case "damaged":
                                            palette = "btn-warning"; // yellow
                                            break;
                                          case "missing":
                                            palette = "btn-error"; // red
                                            break;
                                          case "consumed":
                                            palette = "btn-info"; // blue (if ever used)
                                            break;
                                          default:
                                            palette = "btn-ghost";
                                        }
                                        const outline = value === condition ? "" : "btn-outline";
                                        return `btn btn-xs ${palette} ${outline}`.trim();
                                      };
                                      return (
                                        <div key={`${key}-${pieceIdx}`} className="flex items-center gap-1">
                                          <span className="text-xs">#{pieceIdx + 1}</span>
                                          <div className="btn-group">
                                            <button
                                              type="button"
                                              className={buttonClass("functional")}
                                              onClick={() => handleAssessmentChange(key, pieceIdx, "functional")}
                                            >
                                              OK
                                            </button>
                                            <button
                                              type="button"
                                              className={buttonClass("damaged")}
                                              onClick={() => handleAssessmentChange(key, pieceIdx, "damaged")}
                                            >
                                              Damaged
                                            </button>
                                            <button
                                              type="button"
                                              className={buttonClass("missing")}
                                              onClick={() => handleAssessmentChange(key, pieceIdx, "missing")}
                                            >
                                              Missing
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-base-content/60">
                      Set the condition for each piece before finalizing the return.
                    </p>
                  </>
                ) : groupedReturnAssessments && groupedReturnAssessments.length > 0 ? (
                  <>
                    {viewRequest.returnConditionSummary && (
                      <div className="text-xs text-base-content/70 flex flex-wrap gap-3">
                        <span>Functional: {viewRequest.returnConditionSummary.functional}</span>
                        <span>Damaged: {viewRequest.returnConditionSummary.damaged}</span>
                        <span>Missing: {viewRequest.returnConditionSummary.missing}</span>
                        <span>Consumed: {viewRequest.returnConditionSummary.consumed}</span>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="table w-full text-sm">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Functional</th>
                            <th>Damaged</th>
                            <th>Missing</th>
                            <th>Consumed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedReturnAssessments.map((entry) => (
                            <tr key={entry.equipmentID || entry.name}>
                              <td>
                                <div className="font-medium">{entry.name || entry.equipmentID || "Unknown item"}</div>
                                <div className="text-xs text-base-content/60">
                                  ID: {entry.equipmentID || "—"}
                                </div>
                              </td>
                              <td>{entry.functional}</td>
                              <td>{entry.damaged}</td>
                              <td>{entry.missing}</td>
                              <td>{entry.consumed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <>
                    <ul className="list-disc list-inside text-sm">
                      {viewRequest.items?.map((item) => {
                        const equipment = equipmentList.find((e) => e.equipmentID === item.equipmentID);
                        return (
                          <li key={item.equipmentID}>
                            {equipment?.name || item.equipmentID} — {item.qty} pcs
                          </li>
                        );
                      })}
                    </ul>
                    <div className="text-xs text-base-content/60">
                      Total Qty:{" "}
                      <span className="font-medium">
                        {(viewRequest.items || []).reduce((acc, i) => acc + (i.qty || 0), 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-base-content/60">Admin Remarks</div>
                <div className="whitespace-pre-wrap font-medium">{viewRequest.declinedRemarks || (viewRequest as any).remarks || '—'}</div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {requiresReturnAssessment ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-base-content/70">
                    Review each item and finalize the assessment to clear this return.
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={isFinalizingReturn || !assessmentsReady}
                    onClick={() => finalizeReturnAssessment(viewRequest)}
                  >
                    {isFinalizingReturn ? "Finalizing..." : "Finalize assessment"}
                  </button>
                </div>
              ) : normalizedViewStatus === "returned" ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-base-content/70">
                    This return contains only disposable items. Finalize to clear it.
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={isFinalizingReturn}
                    onClick={() => finalizeReturnAssessment(viewRequest)}
                  >
                    {isFinalizingReturn ? "Finalizing..." : "Finalize"}
                  </button>
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
              ) : canOverrideToApprove || canOverrideToReject ? (
                <div className="rounded-box border border-secondary/30 bg-secondary/5 p-3 space-y-2">
                  <p className="text-sm text-base-content/80">
                    Super admin override is available for this decision.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canOverrideToApprove && (
                      <button
                        className="btn btn-success btn-outline"
                        onClick={() => {
                          setOverrideId(viewRequest.id);
                          setOverrideAction("approve");
                          setOverrideReason("");
                          setOverrideOpen(true);
                          setViewOpen(false);
                          setViewRequest(null);
                        }}
                      >
                        Override to Approve
                      </button>
                    )}
                    {canOverrideToReject && (
                      <button
                        className="btn btn-error btn-outline"
                        onClick={() => {
                          setOverrideId(viewRequest.id);
                          setOverrideAction("reject");
                          setOverrideReason("");
                          setOverrideOpen(true);
                          setViewOpen(false);
                          setViewRequest(null);
                        }}
                      >
                        Override to Reject
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end">
                <button className="btn" onClick={closeRequestModal} disabled={isFinalizingReturn}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
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
                notifications.map((n) => (
                  <div
                    key={`${n.type}-${n.id}`}
                    className="py-3 cursor-pointer hover:bg-base-200 rounded"
                    onClick={() => {
                      setNotifAllOpen(false);
                      focusRequestRow(n.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`badge ${n.type === 'new' ? 'badge-primary' : 'badge-info'} badge-sm`}>
                        {n.type === 'new' ? 'New Request' : 'Returned'}
                      </span>
                      <span className="font-medium">{n.purpose}</span>
                    </div>
                    <div className="text-sm text-base-content/70 mt-1">
                      {n.type === 'new' ? `Submitted by ${n.requester}` : `Marked returned by ${n.requester}`}
                      {n.actionAt ? ` • ${n.actionAt}` : ''}
                    </div>
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
      {/* Decline remarks modal */}
      {declineOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeclineOpen(false);
              setDeclineId(null);
              setDeclineRemarks('');
            }
          }}
        >
          <div
            className="bg-base-100 p-4 rounded shadow max-w-lg w-full max-h-[80vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              onClick={() => {
                setDeclineOpen(false);
                setDeclineId(null);
                setDeclineRemarks('');
              }}
            >
              ✕
            </button>
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
      {overrideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !overrideSubmitting) {
              setOverrideOpen(false);
              setOverrideId(null);
              setOverrideAction(null);
              setOverrideReason("");
            }
          }}
        >
          <div
            className="bg-base-100 p-4 rounded shadow max-w-lg w-full max-h-[80vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              disabled={overrideSubmitting}
              onClick={() => {
                setOverrideOpen(false);
                setOverrideId(null);
                setOverrideAction(null);
                setOverrideReason("");
              }}
            >
              ×
            </button>
            <h3 className="text-lg font-semibold">
              {overrideAction === "approve" ? "Override to Approve" : "Override to Reject"}
            </h3>
            <p className="text-sm text-base-content/70 mb-2">
              {overrideAction === "approve"
                ? "Provide an optional reason for overriding this declined request."
                : "Provide a required reason for overriding this approved request."}
            </p>
            <textarea
              className="textarea textarea-bordered w-full mb-3"
              rows={5}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Enter override reason..."
            />
            <div className="flex justify-end gap-2">
              <button
                className="btn"
                disabled={overrideSubmitting}
                onClick={() => {
                  setOverrideOpen(false);
                  setOverrideId(null);
                  setOverrideAction(null);
                  setOverrideReason("");
                }}
              >
                Cancel
              </button>
              <button
                className={`btn ${overrideAction === "approve" ? "btn-success" : "btn-error"}`}
                disabled={overrideSubmitting}
                onClick={confirmOverride}
              >
                {overrideSubmitting ? "Applying..." : "Confirm Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdminDashboard;
