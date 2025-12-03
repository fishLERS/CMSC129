import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
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
}

const AdminDashboard: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const { equipmentList } = logicEquipment();

  const fetchRequests = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "requests"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Request[];
      setRequests(data);
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

  if (loading) return <p className="text-center mt-10">Loading requests...</p>;

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <h1 className="text-3xl font-bold mb-6">All Requests</h1>

      {requests.length === 0 ? (
        <p>No requests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
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
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
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
                        req.status === "Approved"
                          ? "badge-success"
                          : req.status === "Declined"
                          ? "badge-error"
                          : "badge-warning"
                      }`}
                    >
                      {req.status || "Pending"}
                    </span>
                  </td>
                  <td className="flex gap-2">
                    <button
                      className="btn btn-xs btn-success"
                      disabled={req.status === "Approved"}
                      onClick={() => updateStatus(req.id, "Approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-xs btn-error"
                      disabled={req.status === "Declined"}
                      onClick={() => updateStatus(req.id, "Declined")}
                    >
                      Decline
                    </button>
                  </td>
                  <td>{req.createdAt?.toDate?.().toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;