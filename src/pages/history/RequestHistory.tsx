import React from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Calendar, Clock, Filter, History as HistoryIcon, Layers, Package } from "lucide-react";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import LoadingOverlay from "../../components/LoadingOverlay";

type RequestRecord = {
  id: string;
  createdAt?: Date | null;
  createdAtClient?: string;
  purpose?: string;
  status?: string;
  remarks?: string;
  startDate?: string;
  endDate?: string;
  start?: string;
  end?: string;
  items?: Array<{ equipmentID: string; qty: number }>;
};

const statusBadge = (status: string) => {
  const key = (status || "").toLowerCase();
  if (key === "approved") return <span className="badge badge-success badge-sm">Approved</span>;
  if (key === "pending" || key === "ongoing") return <span className="badge badge-warning badge-sm">Pending</span>;
  if (key === "declined" || key === "rejected") return <span className="badge badge-error badge-sm">Declined</span>;
  if (key === "returned" || key === "completed") return <span className="badge badge-info badge-sm">Completed</span>;
  if (key === "cancelled") return <span className="badge badge-secondary badge-sm">Cancelled</span>;
  return <span className="badge badge-outline badge-sm">{status || "-"}</span>;
};

const formatRange = (req: RequestRecord) => {
  const start = req.startDate ? `${req.startDate} ${req.start || ""}`.trim() : "";
  const end = req.endDate ? `${req.endDate} ${req.end || ""}`.trim() : "";
  if (!start && !end) return "No schedule provided";
  if (start && end) return `${start} to ${end}`;
  return start || end;
};

export default function RequestHistory() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<RequestRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | string>("all");
  const [yearFilter, setYearFilter] = React.useState<"all" | string>("all");

  React.useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "requests"),
      where("createdBy", "==", user.uid),
      orderBy("createdAtClient", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: RequestRecord[] = snapshot.docs.map((doc) => {
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
            createdAt,
            createdAtClient: data.createdAtClient,
            purpose: data.purpose,
            status: data.status,
            remarks: data.declinedRemarks || data.remarks,
            startDate: data.startDate,
            endDate: data.endDate,
            start: data.start,
            end: data.end,
            items: data.items || [],
          };
        });
        setRequests(docs);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [user]);

  const years = React.useMemo(() => {
    const set = new Set<string>();
    requests.forEach((req) => {
      if (req.createdAt) set.add(req.createdAt.getFullYear().toString());
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [requests]);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((req) => {
      const statusMatch =
        statusFilter === "all" || (req.status || "").toLowerCase() === statusFilter;
      const yearMatch =
        yearFilter === "all" ||
        (req.createdAt && req.createdAt.getFullYear().toString() === yearFilter);
      const textMatch =
        !term ||
        req.purpose?.toLowerCase().includes(term) ||
        req.id.toLowerCase().includes(term) ||
        req.status?.toLowerCase().includes(term);
      return statusMatch && yearMatch && textMatch;
    });
  }, [requests, search, statusFilter, yearFilter]);

  const { activeRequests, pastRequests } = React.useMemo(() => {
    const active: RequestRecord[] = [];
    const past: RequestRecord[] = [];
    filtered.forEach((req) => {
      const statusKey = (req.status || "").toLowerCase();
      if (statusKey === "pending" || statusKey === "ongoing") {
        active.push(req);
      } else {
        past.push(req);
      }
    });
    return { activeRequests: active, pastRequests: past };
  }, [filtered]);

  if (!user) {
    return <div className="p-6">Please sign in to view your history.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <LoadingOverlay show={loading} message="Loading request history..." />

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HistoryIcon className="w-6 h-6" />
            Request History
          </h1>
          <p className="text-base-content/70">
            Review every request you've made and revisit important details.
          </p>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="Search by purpose, status, or ID"
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
                <option value="approved">Approved</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
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
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-base-content/60">
              <p className="font-medium">No requests match your filters.</p>
              <p className="text-sm">Adjust the filters above to see previous activity.</p>
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Active requests
                  </h2>
                  <span className="badge badge-primary badge-outline">{activeRequests.length}</span>
                </div>
                {activeRequests.length === 0 ? (
                  <p className="text-sm text-base-content/60">
                    No pending or ongoing requests match your filters.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>Request</th>
                          <th>Submitted &amp; schedule</th>
                          <th>Items</th>
                          <th>Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRequests.map((req) => {
                          const submittedOn = req.createdAt
                            ? req.createdAt.toLocaleString()
                            : req.createdAtClient || "Unknown";
                          const itemCount =
                            req.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
                          return (
                            <tr key={req.id}>
                              <td>
                                <div className="font-semibold">{req.purpose || "Untitled Request"}</div>
                                <div className="text-xs text-base-content/60">ID: {req.id}</div>
                              </td>
                              <td>
                                <div className="text-sm font-medium">{submittedOn}</div>
                                <div className="text-xs text-base-content/60">{formatRange(req)}</div>
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4" />
                                  <span className="font-semibold">{itemCount}</span>
                                  <span className="text-xs text-base-content/60">items</span>
                                </div>
                              </td>
                              <td>{statusBadge(req.status || "")}</td>
                              <td>
                                {req.remarks ? (
                                  <div className="text-sm whitespace-pre-wrap">{req.remarks}</div>
                                ) : (
                                  <span className="text-base-content/50 text-sm">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Past requests</h2>
                  <span className="badge badge-outline">{pastRequests.length}</span>
                </div>
                {pastRequests.length === 0 ? (
                  <p className="text-sm text-base-content/60">
                    No past requests match your current filters.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>Request</th>
                          <th>Submitted &amp; schedule</th>
                          <th>Items</th>
                          <th>Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastRequests.map((req) => {
                          const submittedOn = req.createdAt
                            ? req.createdAt.toLocaleString()
                            : req.createdAtClient || "Unknown";
                          const itemCount =
                            req.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
                          return (
                            <tr key={req.id}>
                              <td>
                                <div className="font-semibold">{req.purpose || "Untitled Request"}</div>
                                <div className="text-xs text-base-content/60">ID: {req.id}</div>
                              </td>
                              <td>
                                <div className="text-sm font-medium">{submittedOn}</div>
                                <div className="text-xs text-base-content/60">{formatRange(req)}</div>
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4" />
                                  <span className="font-semibold">{itemCount}</span>
                                  <span className="text-xs text-base-content/60">items</span>
                                </div>
                              </td>
                              <td>{statusBadge(req.status || "")}</td>
                              <td>
                                {req.remarks ? (
                                  <div className="text-sm whitespace-pre-wrap">{req.remarks}</div>
                                ) : (
                                  <span className="text-base-content/50 text-sm">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
