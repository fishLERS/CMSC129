import React from 'react'
import AdminSidebar from '../../adminSidebar'

const AdminAccountabilities: React.FC = () => {
  return (
    <>
      <AdminSidebar />
      <div style={{ marginLeft: 'var(--sidebar-width)' }} className="min-h-screen bg-base-100 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Accountabilities</h1>
          <button className="btn btn-outline rounded-full px-4 py-2">Add New Accountability <span className="ml-2">+</span></button>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Date Due</th>
                    <th>Amount Due</th>
                    <th>Details</th>
                    <th>Student Number</th>
                    <th>Date Incurred</th>
                  </tr>
                </thead>
                <tbody>
                  {/* placeholder rows to match mockup spacing */}
                  <tr>
                    <td colSpan={5} className="h-12"></td>
                  </tr>
                    {/* removed highlighted blue placeholder row per design */}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminAccountabilities
