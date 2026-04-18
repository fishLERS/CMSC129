import React from "react";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

type Capability = {
  key: string;
  label: string;
  student: boolean;
  admin: boolean;
  superAdmin: boolean;
  note?: string;
  path?: string;
};

const capabilities: Capability[] = [
  {
    key: "submit_requests",
    label: "Submit equipment requests",
    student: true,
    admin: false,
    superAdmin: false,
    path: "/requestpage",
  },
  {
    key: "track_own_requests",
    label: "Track own requests",
    student: true,
    admin: false,
    superAdmin: false,
    path: "/tracking",
  },
  {
    key: "view_inventory",
    label: "Access inventory module",
    student: false,
    admin: true,
    superAdmin: true,
    path: "/inventory",
  },
  {
    key: "approve_reject",
    label: "Approve / reject requests",
    student: false,
    admin: true,
    superAdmin: true,
    path: "/admindashboard",
  },
  {
    key: "override_decisions",
    label: "Override request decisions",
    student: false,
    admin: false,
    superAdmin: true,
    path: "/admindashboard",
  },
  {
    key: "admin_accounts",
    label: "Manage admin accounts",
    student: false,
    admin: false,
    superAdmin: true,
    path: "/admin/users",
  },
  {
    key: "super_admin_accounts",
    label: "Manage super-admin status",
    student: false,
    admin: false,
    superAdmin: true,
    path: "/admin/users",
  },
  {
    key: "analytics",
    label: "View analytics",
    student: false,
    admin: true,
    superAdmin: true,
    path: "/analytics",
  },
  {
    key: "history",
    label: "View request history",
    student: false,
    admin: true,
    superAdmin: true,
    path: "/admin/history",
  },
  {
    key: "accountabilities",
    label: "Manage accountabilities",
    student: false,
    admin: true,
    superAdmin: true,
    path: "/admin/accountabilities",
  },
  {
    key: "migration",
    label: "Run data migration tool",
    student: false,
    admin: false,
    superAdmin: true,
    path: "/admin/migration",
  },
  {
    key: "super_activity",
    label: "View super-admin activity log",
    student: false,
    admin: false,
    superAdmin: true,
    path: "/admin/super-activity",
  },
];

function Cell({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="inline-flex items-center gap-1 text-success font-medium">
      <CheckCircle2 className="w-4 h-4" />
      Allowed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-base-content/60">
      <XCircle className="w-4 h-4" />
      Not allowed
    </span>
  );
}

const PermissionsMatrix: React.FC = () => {
  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Permission Matrix
        </h1>
        <p className="text-base-content/70">
          Quick reference of role capabilities across Student, Admin, and Super Admin.
        </p>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table w-full min-w-[720px]">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Student</th>
                  <th>Admin</th>
                  <th>Super Admin</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map((cap) => (
                  <tr key={cap.key}>
                    <td>
                      {cap.path ? (
                        <Link to={cap.path} className="font-medium link link-hover link-primary">
                          {cap.label}
                        </Link>
                      ) : (
                        <div className="font-medium">{cap.label}</div>
                      )}
                      {cap.note && <div className="text-xs text-base-content/60">{cap.note}</div>}
                    </td>
                    <td>
                      <Cell allowed={cap.student} />
                    </td>
                    <td>
                      <Cell allowed={cap.admin} />
                    </td>
                    <td>
                      <Cell allowed={cap.superAdmin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="alert alert-info">
        <span>
          Route guards and backend claim checks are the source of truth. This matrix is a UI guide.
        </span>
      </div>
    </div>
  );
};

export default PermissionsMatrix;
