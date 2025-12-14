import React from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Calendar,
  Clock,
  Filter,
  History as HistoryIcon,
  Layers,
  Package,
} from "lucide-react";
import LoadingOverlay from "../../components/LoadingOverlay";
import { db } from "../../firebase";
import { logicEquipment } from "../equipment/logicEquipment";

type RequestItem = {
  equipmentID: string;
  qty: number;
};

type AdminRequestRecord = {
  id: string;
  adviser?: string;
  purpose?: string;
  startDate?: string;
  endDate?: string;
  start?: string;
  end?: string;
  items?: RequestItem[];
  createdAt?: Date | null;
  createdAtClient?: string;
  status?: string;
  createdBy?: string;
  createdByName?: string;
  declinedRemarks?: string;
};

const getStatusBadgeClass = (status: string) => {
  const key = (status || "").toLowerCase();
  if (key === "approved") return "badge-success";
  if (key === "pending" || key === "ongoing" || key === "") return "badge-warning";
  if (key === "declined" || key === "rejected") return "badge-error";
  if (key === "cancelled") return "badge-info";
  if (key === "completed" || key === "returned") return "badge-primary";
  return "badge-outline";
};

const formatRange = (req: AdminRequestRecord) => {
  const start = req.startDate ? `${req.startDate} ${req.start || ""}`.trim() : "";
  const end = req.endDate ? `${req.endDate} ${req.end || ""}`.trim() : "";
  if (!start && !end) return "No schedule provided";
  if (start && end) return `${start} to ${end}`;
  return start || end;
};

const AdminRequestHistory: React.FC = () => {
  const [requests, setRequests] = React.useState<AdminRequestRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | string>("all");
  const [yearFilter, setYearFilter] = React.useState<"all" | string>("all");
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc");
  const [selectedRequest, setSelectedRequest] = React.useState<AdminRequestRecord | null>(null);
  const [nameMap, setNameMap] = React.useState<Record<string, string>>({});
  const { equipmentList, isLoading: isEquipmentLoading } = logicEquipment();

  React.useEffect(() => {
    const q = query(collection(db, "requests"), orderBy("createdAtClient", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs: AdminRequestRecord[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          let createdAt: Date | null = null;
          try {
            if (data.createdAt && typeof data.createdAt.toDate === "function") {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt) {
              createdAt = new Date(data.createdAt);
            } else if (data.createdAtClient) {
              createdAt = new Date(data.createdAtClient);
            }
          } catch {
            createdAt = null;
          }
          return {
            id: doc.id,
            adviser: data.adviser,
            purpose: data.purpose,
            startDate: data.startDate,
            endDate: data.endDate,
            start: data.start,
            end: data.end,
            items: data.items || [],
            createdAt,
            createdAtClient: data.createdAtClient,
            status: data.status,
            createdBy: data.createdBy,
            createdByName: data.createdByName,
            declinedRemarks: data.declinedRemarks || data.remarks,
          };
        });
        setRequests(docs);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  React.useEffect(() => {
    const missing = Array.from(
      new Set(
        requests
          .map((req) => req.createdBy)
          .filter((uid): uid is string => !!uid && !nameMap[uid])
      )
    );
    if (!missing.length) return;

    missing.forEach(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          setNameMap((prev) => ({
            ...prev,
            [uid]: data.displayName || data.email || uid,
          }));
        }
      } catch (e) {
        console.warn("Failed to fetch user profile", e);
      }
    });
  }, [requests, nameMap]);

  const years = React.useMemo(() => {
    const set = new Set<string>();
    requests.forEach((req) => {
      if (req.createdAt) {
        set.add(req.createdAt.getFullYear().toString());
      }
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [requests]);

  const stats = React.useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((req) =>
      ["pending", "ongoing", ""].includes((req.status || "").toLowerCase())
    ).length;
    const approved = requests.filter(
      (req) => (req.status || "").toLowerCase() === "approved"
    ).length;
    const declined = requests.filter((req) =>
      ["declined", "rejected"].includes((req.status || "").toLowerCase())
    ).length;
    const cancelled = requests.filter(
      (req) => (req.status || "").toLowerCase() === "cancelled"
    ).length;
    return { total, pending, approved, declined, cancelled };
  }, [requests]);

  const getRequester = (req: AdminRequestRecord) => {
    if (req.createdByName) return req.createdByName;
    if (req.createdBy && nameMap[req.createdBy]) return nameMap[req.createdBy];
    if (req.createdBy) return req.createdBy;
    return "Unknown requester";
  };

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = requests.filter((req) => {
      const statusKey = (req.status || "").toLowerCase();
      const statusMatch = statusFilter === "all" || statusKey === statusFilter;
      const requester = getRequester(req).toLowerCase();
      const yearMatch =
        yearFilter === "all" ||
        (req.createdAt && req.createdAt.getFullYear().toString() === yearFilter);
      const matchesSearch =
        !term ||
        requester.includes(term) ||
        (req.purpose || "").toLowerCase().includes(term) ||
        (req.id || "").toLowerCase().includes(term);
      return statusMatch && yearMatch && matchesSearch;
    });

    const getSortValue = (req: AdminRequestRecord) => {
      if (req.createdAt) return req.createdAt.getTime();
      if (req.createdAtClient) return new Date(req.createdAtClient).getTime();
      return 0;
    };

    return list.sort((a, b) => {
      const diff = getSortValue(a) - getSortValue(b);
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [requests, search, statusFilter, yearFilter, sortOrder, nameMap]);

  const grouped = React.useMemo(() => {
    const buckets: Record<string, AdminRequestRecord[]> = {};
    filtered.forEach((req) => {
      const date =
        req.createdAt ||
        (req.createdAtClient ? new Date(req.createdAtClient) : null);
      const key = date
        ? `${date.toLocaleString("default", { month: "long" })} ${date.getFullYear()}`
        : "Undated";
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(req);
    });
    return Object.entries(buckets);
  }, [filtered]);

  const activeFilters =
    search.trim().length > 0 || statusFilter !== "all" || yearFilter !== "all";

  return (
    <div className="p-6 space-y-6">
      <LoadingOverlay
        show={loading || isEquipmentLoading}
        message="Loading full request history..."
      />

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HistoryIcon className="w-6 h-6" />
            Request History
          </h1>
          <p className="text-base-content/70">
            Audit every student request with filters for quick investigations.
          </p>
        </div>
      </div>

      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
        <div className="stat">
          <div className="stat-title">Total Requests</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-desc">All records</div>
        </div>
        <div className="stat">
          <div className="stat-title">Pending / Ongoing</div>
          <div className="stat-value text-warning">{stats.pending}</div>
          <div className="stat-desc">Awaiting decisions</div>
        </div>
        <div className="stat">
          <div className="stat-title">Approved</div>
          <div className="stat-value text-success">{stats.approved}</div>
          <div className="stat-desc">Cleared for release</div>
        </div>
        <div className="stat">
          <div className="stat-title">Declined</div>
          <div className="stat-value text-error">{stats.declined}</div>
          <div className="stat-desc">Requires follow-up</div>
        </div>
        <div className="stat">
          <div className="stat-title">Cancelled</div>
          <div className="stat-value text-info">{stats.cancelled}</div>
          <div className="stat-desc">Withdrawn by students</div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <label className="form-control">
              <div className="label">
                <span className="label-text flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Search
                </span>
              </div>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Search by requester, purpose, or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Status
                </span>
              </div>
              <select
                className="select select-bordered"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | string)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="ongoing">Ongoing</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="returned">Returned</option>
              </select>
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Year
                </span>
              </div>
              <select
                className="select select-bordered"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value as "all" | string)}
              >
                <option value="all">All years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text">Sort</span>
              </div>
              <select
                className="select select-bordered"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
          </div>

          {activeFilters && (
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-outline">Filters active</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setYearFilter("all");
                  setSortOrder("desc");
                }}
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="card bg-base-100 shadow text-center py-12">
          <p className="font-medium">No history matches your filters.</p>
          <p className="text-sm text-base-content/60">
            Adjust filters above to see archived requests.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([bucket, entries]) => (
            <div key={bucket} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{bucket}</h2>
                <span className="badge badge-outline">{entries.length}</span>
              </div>
              <div className="card bg-base-100 border border-base-300 shadow">
                <div className="card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Request</th>
                          <th>Requester</th>
                          <th>Schedule</th>
                          <th>Items</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((req) => {
                          const requester = getRequester(req);
                          const itemCount =
                            req.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
                          const submittedOn = req.createdAt
                            ? req.createdAt.toLocaleString()
                            : req.createdAtClient || "Unknown";
                          return (
                            <tr
                              key={req.id}
                              className="hover:bg-primary/10 cursor-pointer transition-colors"
                              onClick={() => setSelectedRequest(req)}
                            >
                              <td>
                                <div className="font-semibold">{req.purpose || "Untitled Request"}</div>
                                <div className="text-xs text-base-content/60">
                                  Submitted {submittedOn}
                                </div>
                                <div className="text-xs text-base-content/60 font-mono">
                                  ID: {req.id}
                                </div>
                              </td>
                              <td>
                                <div className="font-semibold">{requester}</div>
                                <div className="text-xs text-base-content/60">
                                  Adviser: {req.adviser || "Not provided"}
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4" />
                                  {formatRange(req)}
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4" />
                                  {itemCount} items
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(req.status || "")}`}>
                                  {req.status || "Pending"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <div
          className="modal modal-open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRequest(null);
          }}
        >
          <div className="modal-box max-w-3xl">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              onClick={() => setSelectedRequest(null)}
            >
              ✕
            </button>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-base-content/60">
                  Request Purpose
                </p>
                <h3 className="text-2xl font-bold break-words">
                  {selectedRequest.purpose || "Untitled Request"}
                </h3>
                <p className="text-sm text-base-content/70">
                  {getRequester(selectedRequest)} •{" "}
                  {selectedRequest.createdAt
                    ? selectedRequest.createdAt.toLocaleString()
                    : selectedRequest.createdAtClient || "Unknown timestamp"}
                </p>
                <p className="text-xs text-base-content/60 font-mono mt-1">
                  ID: {selectedRequest.id}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-base-200 rounded-lg p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-base-content/60">
                    Purpose
                  </p>
                  <p className="font-semibold">
                    {selectedRequest.purpose || "No purpose provided"}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-base-content/60">
                    Adviser
                  </p>
                  <p>{selectedRequest.adviser || "Not provided"}</p>
                  <p className="text-xs uppercase tracking-wide text-base-content/60">
                    Schedule
                  </p>
                  <p>{formatRange(selectedRequest)}</p>
                </div>
                <div className="bg-base-200 rounded-lg p-4 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-base-content/60">
                    Status
                  </p>
                  <span className={`badge ${getStatusBadgeClass(selectedRequest.status || "")}`}>
                    {selectedRequest.status || "Pending"}
                  </span>
                  <p className="text-xs uppercase tracking-wide text-base-content/60">
                    Remarks
                  </p>
                  <p className="whitespace-pre-wrap text-sm">
                    {selectedRequest.declinedRemarks || "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-base-content/60 mb-2">
                  Items requested
                </p>
                {selectedRequest.items && selectedRequest.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.items.map((item) => {
                          const equipment = equipmentList.find(
                            (eq) => eq.equipmentID === item.equipmentID
                          );
                          return (
                            <tr key={item.equipmentID}>
                              <td>{equipment?.name || item.equipmentID}</td>
                              <td>{item.qty || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-base-content/70">
                    No items recorded for this request.
                  </p>
                )}
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setSelectedRequest(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequestHistory;
