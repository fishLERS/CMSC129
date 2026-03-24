import React from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Activity, Calendar, Filter, ShieldCheck } from "lucide-react";
import LoadingOverlay from "../../components/LoadingOverlay";
import { db } from "../../firebase";
import { formatRoleLabel } from "../../utils/roleLabel";

type RequestDoc = {
  id: string;
  purpose?: string;
  status?: string;
  overriddenBy?: string;
  overriddenAt?: any;
  overrideReason?: string;
  overrideFromStatus?: string;
  updatedAt?: any;
};

type UserDoc = {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
  isSuperAdmin?: boolean;
  updatedAt?: any;
};

type ActivityType = "override" | "privilege";

type ActivityEvent = {
  id: string;
  type: ActivityType;
  occurredAt: Date | null;
  actorUid?: string;
  actorLabel: string;
  title: string;
  description: string;
  requestId?: string;
  targetUid?: string;
};

function parseTimestamp(value: any): Date | null {
  try {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (value instanceof Date) return value;
  } catch {
    return null;
  }
  return null;
}

function normalizeStatus(status?: string): string {
  const s = (status || "").toLowerCase();
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SuperAdminActivityLog: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [requests, setRequests] = React.useState<RequestDoc[]>([]);
  const [users, setUsers] = React.useState<UserDoc[]>([]);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | ActivityType>("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc");

  React.useEffect(() => {
    const reqQuery = query(collection(db, "requests"), orderBy("updatedAt", "desc"));
    const userQuery = query(collection(db, "users"), orderBy("updatedAt", "desc"));

    let requestsReady = false;
    let usersReady = false;

    const finishLoading = () => {
      if (requestsReady && usersReady) {
        setLoading(false);
      }
    };

    const unsubRequests = onSnapshot(
      reqQuery,
      (snap) => {
        const next = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as RequestDoc[];
        setRequests(next);
        requestsReady = true;
        finishLoading();
      },
      () => {
        requestsReady = true;
        finishLoading();
      }
    );

    const unsubUsers = onSnapshot(
      userQuery,
      (snap) => {
        const next = snap.docs.map((d) => ({
          uid: d.id,
          ...(d.data() as any),
        })) as UserDoc[];
        setUsers(next);
        usersReady = true;
        finishLoading();
      },
      () => {
        usersReady = true;
        finishLoading();
      }
    );

    return () => {
      unsubRequests();
      unsubUsers();
    };
  }, []);

  const userNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => {
      map[u.uid] = u.displayName || u.email || u.uid;
    });
    return map;
  }, [users]);

  const allEvents = React.useMemo(() => {
    const overrideEvents: ActivityEvent[] = requests
      .filter((r) => !!r.overriddenBy || !!r.overriddenAt || !!r.overrideReason)
      .map((r) => {
        const actorUid = r.overriddenBy;
        const actorLabel = actorUid ? userNameMap[actorUid] || actorUid : "Unknown actor";
        const from = normalizeStatus(r.overrideFromStatus);
        const to = normalizeStatus(r.status);
        return {
          id: `override-${r.id}`,
          type: "override",
          occurredAt: parseTimestamp(r.overriddenAt) || parseTimestamp(r.updatedAt),
          actorUid,
          actorLabel,
          title: "Request Decision Overridden",
          description: `${from} to ${to}${r.purpose ? ` • ${r.purpose}` : ""}${r.overrideReason ? ` • Reason: ${r.overrideReason}` : ""}`,
          requestId: r.id,
        };
      });

    const privilegeEvents: ActivityEvent[] = users
      .filter((u) => u.role === "admin" || !!u.isSuperAdmin)
      .map((u) => {
        const roleLabel = formatRoleLabel(u.role || "student", !!u.isSuperAdmin);
        return {
          id: `privilege-${u.uid}-${u.updatedAt || "na"}`,
          type: "privilege",
          occurredAt: parseTimestamp(u.updatedAt),
          actorUid: u.uid,
          actorLabel: u.displayName || u.email || u.uid,
          title: "Privilege State Updated",
          description: `Current role: ${roleLabel}`,
          targetUid: u.uid,
        };
      });

    return [...overrideEvents, ...privilegeEvents];
  }, [requests, users, userNameMap]);

  const stats = React.useMemo(() => {
    const total = allEvents.length;
    const overrides = allEvents.filter((e) => e.type === "override").length;
    const privileges = allEvents.filter((e) => e.type === "privilege").length;
    return { total, overrides, privileges };
  }, [allEvents]);

  const filteredEvents = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    const next = allEvents.filter((event) => {
      if (typeFilter !== "all" && event.type !== typeFilter) return false;

      const matchesTerm =
        !term ||
        event.actorLabel.toLowerCase().includes(term) ||
        event.title.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term) ||
        (event.requestId || "").toLowerCase().includes(term) ||
        (event.targetUid || "").toLowerCase().includes(term);

      if (!matchesTerm) return false;

      if (from || to) {
        if (!event.occurredAt) return false;
        if (from && event.occurredAt < from) return false;
        if (to && event.occurredAt > to) return false;
      }

      return true;
    });

    return next.sort((a, b) => {
      const aVal = a.occurredAt ? a.occurredAt.getTime() : 0;
      const bVal = b.occurredAt ? b.occurredAt.getTime() : 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [allEvents, search, typeFilter, fromDate, toDate, sortOrder]);

  const hasFilters =
    !!search.trim() || typeFilter !== "all" || !!fromDate || !!toDate || sortOrder !== "desc";

  return (
    <div className="p-6 space-y-6">
      <LoadingOverlay show={loading} message="Loading super admin activity..." />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Super Admin Activity
        </h1>
        <p className="text-base-content/70">
          Track override decisions and privilege-state updates with searchable audit filters.
        </p>
      </div>

      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
        <div className="stat">
          <div className="stat-title">Total Events</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-desc">All logged activity</div>
        </div>
        <div className="stat">
          <div className="stat-title">Overrides</div>
          <div className="stat-value text-secondary">{stats.overrides}</div>
          <div className="stat-desc">Request decisions changed</div>
        </div>
        <div className="stat">
          <div className="stat-title">Privilege Updates</div>
          <div className="stat-value text-accent">{stats.privileges}</div>
          <div className="stat-desc">Role/super-admin state</div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <label className="form-control lg:col-span-2">
              <div className="label">
                <span className="label-text flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Search
                </span>
              </div>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Actor, request ID, title, description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text">Type</span>
              </div>
              <select
                className="select select-bordered"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | ActivityType)}
              >
                <option value="all">All types</option>
                <option value="override">Override</option>
                <option value="privilege">Privilege</option>
              </select>
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  From
                </span>
              </div>
              <input
                type="date"
                className="input input-bordered"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  To
                </span>
              </div>
              <input
                type="date"
                className="input input-bordered"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="form-control w-48">
              <div className="label py-0">
                <span className="label-text">Sort</span>
              </div>
              <select
                className="select select-bordered select-sm"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>

            {hasFilters && (
              <button
                className="btn btn-ghost btn-sm mt-6"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setFromDate("");
                  setToDate("");
                  setSortOrder("desc");
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="card bg-base-100 border border-base-300 shadow text-center py-12">
          <p className="font-medium">No activity matches your filters.</p>
          <p className="text-sm text-base-content/60">Try broadening the date range or search term.</p>
        </div>
      ) : (
        <div className="card bg-base-100 border border-base-300 shadow">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Actor</th>
                    <th>Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <span
                          className={`badge ${
                            event.type === "override" ? "badge-secondary" : "badge-accent"
                          }`}
                        >
                          {event.type === "override" ? "Override" : "Privilege"}
                        </span>
                      </td>
                      <td>
                        <div className="font-medium">{event.actorLabel}</div>
                        <div className="text-xs text-base-content/60 font-mono">
                          {event.actorUid || event.targetUid || "—"}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          {event.title}
                        </div>
                        <div className="text-sm text-base-content/70">{event.description}</div>
                        {event.requestId && (
                          <div className="text-xs text-base-content/60 font-mono">
                            Request: {event.requestId}
                          </div>
                        )}
                      </td>
                      <td>
                        {event.occurredAt ? event.occurredAt.toLocaleString() : "Unknown"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminActivityLog;
