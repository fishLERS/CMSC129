import React from 'react'

const AdminAccountabilities: React.FC = () => {
  return (
    <>
      <div className="min-h-screen bg-base-100 p-6">
        <div className="card">
          <div className="card-body space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4">
              <h2 className="card-title text-2xl">Accountabilities</h2>
              <button className="btn btn-outline rounded-full px-4 py-2">Add New Accountability <span className="ml-2">+</span></button>
            </header>

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
                    <td colSpan={5} className="h-12 text-base-content/60"></td>
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
