import React from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { TrendingUp, TrendingDown, Users, Package, ClipboardList, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface RequestData {
  id: string
  status: string
  createdAt: any
  createdAtClient?: string
  createdBy: string
  purpose?: string
  items?: any[]
}

interface EquipmentData {
  equipmentID: string
  name: string
  totalInventory: number
  category?: string
  isDisposable?: boolean
}

interface UserData {
  uid: string
  role: string
  createdAt: any
  requestedAdmin?: boolean
}

export default function Analytics() {
  const [loading, setLoading] = React.useState(true)
  const [requests, setRequests] = React.useState<RequestData[]>([])
  const [equipment, setEquipment] = React.useState<EquipmentData[]>([])
  const [users, setUsers] = React.useState<UserData[]>([])

  React.useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    try {
      setLoading(true)
      
      // Load requests
      const requestsSnap = await getDocs(collection(db, 'requests'))
      const requestsList: RequestData[] = []
      requestsSnap.forEach((doc) => {
        const data = doc.data()
        requestsList.push({
          id: doc.id,
          status: data.status || 'unknown',
          createdAt: data.createdAt,
          createdAtClient: data.createdAtClient,
          createdBy: data.createdBy || '',
          purpose: data.purpose || '',
          items: data.items || [],
        })
      })
      setRequests(requestsList)

      // Load equipment
      const equipmentSnap = await getDocs(collection(db, 'equipment'))
      const equipmentList: EquipmentData[] = []
      equipmentSnap.forEach((doc) => {
        const data = doc.data()
        equipmentList.push({
          equipmentID: doc.id,
          name: data.name || '',
          totalInventory: data.totalInventory || 0,
          category: data.category || 'Uncategorized',
          isDisposable: data.isDisposable || false,
        })
      })
      setEquipment(equipmentList)

      // Load users
      const usersSnap = await getDocs(collection(db, 'users'))
      const usersList: UserData[] = []
      usersSnap.forEach((doc) => {
        const data = doc.data()
        usersList.push({
          uid: doc.id,
          role: data.role || 'student',
          createdAt: data.createdAt,
          requestedAdmin: data.requestedAdmin || false,
        })
      })
      setUsers(usersList)

    } catch (e) {
      console.error('Failed to load analytics data', e)
    } finally {
      setLoading(false)
    }
  }

  // Request statistics
  const totalRequests = requests.length
  const pendingRequests = requests.filter(r => r.status === 'ongoing' || r.status === 'pending').length
  const approvedRequests = requests.filter(r => r.status === 'approved').length
  const declinedRequests = requests.filter(r => r.status === 'declined' || r.status === 'rejected').length
  const returnedRequests = requests.filter(r => r.status === 'returned').length
  const cancelledRequests = requests.filter(r => r.status === 'cancelled').length

  // Equipment statistics
  const totalEquipment = equipment.length
  const totalInventoryItems = equipment.reduce((sum, e) => sum + (e.totalInventory || 0), 0)
  const disposableItems = equipment.filter(e => e.isDisposable).length
  const reusableItems = equipment.filter(e => !e.isDisposable).length

  // Equipment by category
  const equipmentByCategory: Record<string, number> = {}
  equipment.forEach(e => {
    const cat = e.category || 'Uncategorized'
    equipmentByCategory[cat] = (equipmentByCategory[cat] || 0) + 1
  })

  // User statistics
  const totalUsers = users.length
  const adminUsers = users.filter(u => u.role === 'admin').length
  const studentUsers = users.filter(u => u.role === 'student' || u.role !== 'admin').length
  const pendingAdminRequests = users.filter(u => u.requestedAdmin && u.role !== 'admin').length

  // Requests by month (last 6 months)
  const monthlyRequests: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
    monthlyRequests[key] = 0
  }
  requests.forEach(r => {
    let date: Date | null = null
    if (r.createdAtClient) {
      date = new Date(r.createdAtClient)
    } else if (r.createdAt?.toDate) {
      date = r.createdAt.toDate()
    }
    if (date) {
      const key = date.toLocaleString('default', { month: 'short', year: '2-digit' })
      if (key in monthlyRequests) {
        monthlyRequests[key]++
      }
    }
  })

  // Most requested items
  const itemCounts: Record<string, number> = {}
  requests.forEach(r => {
    if (r.items && Array.isArray(r.items)) {
      r.items.forEach((item: any) => {
        const name = typeof item === 'string' ? item : (item?.name || item?.item || 'Unknown')
        itemCounts[name] = (itemCounts[name] || 0) + 1
      })
    }
  })
  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Calculate approval rate
  const completedRequests = approvedRequests + declinedRequests
  const approvalRate = completedRequests > 0 ? Math.round((approvedRequests / completedRequests) * 100) : 0

  if (loading) {
    return (
      <div>
        <div className="min-h-screen bg-transparent text-slate-200 p-4">
          <h1 className="text-2xl font-semibold mb-4">Analytics</h1>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading analytics data...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="min-h-screen bg-transparent text-slate-200 p-4">
        <h1 className="text-2xl font-semibold mb-6">Analytics Dashboard</h1>

        <div className="max-w-7xl mx-auto space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Requests"
              value={totalRequests}
              icon={<ClipboardList className="w-8 h-8" />}
              color="bg-blue-500"
            />
            <StatCard
              title="Total Equipment"
              value={totalEquipment}
              subtitle={`${totalInventoryItems} total items`}
              icon={<Package className="w-8 h-8" />}
              color="bg-green-500"
            />
            <StatCard
              title="Total Users"
              value={totalUsers}
              subtitle={`${adminUsers} admins, ${studentUsers} students`}
              icon={<Users className="w-8 h-8" />}
              color="bg-purple-500"
            />
            <StatCard
              title="Approval Rate"
              value={`${approvalRate}%`}
              subtitle={`${approvedRequests} approved of ${completedRequests}`}
              icon={approvalRate >= 50 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
              color={approvalRate >= 50 ? "bg-emerald-500" : "bg-red-500"}
            />
          </div>

          {/* Request Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-base-100 rounded-lg p-6 text-base-content">
              <h2 className="text-lg font-semibold mb-4">Request Status Breakdown</h2>
              <div className="space-y-3">
                <StatusBar label="Pending/Ongoing" value={pendingRequests} total={totalRequests} color="bg-yellow-500" icon={<Clock className="w-4 h-4" />} />
                <StatusBar label="Approved" value={approvedRequests} total={totalRequests} color="bg-green-500" icon={<CheckCircle className="w-4 h-4" />} />
                <StatusBar label="Declined" value={declinedRequests} total={totalRequests} color="bg-red-500" icon={<XCircle className="w-4 h-4" />} />
                <StatusBar label="Returned" value={returnedRequests} total={totalRequests} color="bg-blue-500" icon={<Package className="w-4 h-4" />} />
                <StatusBar label="Cancelled" value={cancelledRequests} total={totalRequests} color="bg-gray-500" icon={<AlertCircle className="w-4 h-4" />} />
              </div>
            </div>

            <div className="bg-base-100 rounded-lg p-6 text-base-content">
              <h2 className="text-lg font-semibold mb-4">Requests Over Time</h2>
              <div className="flex items-end justify-between h-40 gap-2">
                {Object.entries(monthlyRequests).map(([month, count]) => {
                  const maxCount = Math.max(...Object.values(monthlyRequests), 1)
                  const height = (count / maxCount) * 100
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center">
                      <div className="text-xs mb-1">{count}</div>
                      <div
                        className="w-full bg-primary rounded-t transition-all"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <div className="text-xs mt-2 text-base-content/60">{month}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Equipment & Top Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-base-100 rounded-lg p-6 text-base-content">
              <h2 className="text-lg font-semibold mb-4">Equipment by Category</h2>
              {Object.keys(equipmentByCategory).length === 0 ? (
                <div className="text-base-content/60">No equipment data available</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(equipmentByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span>{category}</span>
                      <span className="bg-base-200 px-3 py-1 rounded-full text-sm font-medium">{count}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t mt-3">
                    <div className="flex items-center justify-between text-sm text-base-content/60">
                      <span>Disposable items:</span>
                      <span>{disposableItems}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-base-content/60">
                      <span>Reusable items:</span>
                      <span>{reusableItems}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-base-100 rounded-lg p-6 text-base-content">
              <h2 className="text-lg font-semibold mb-4">Most Requested Items</h2>
              {topItems.length === 0 ? (
                <div className="text-base-content/60">No request data available</div>
              ) : (
                <div className="space-y-3">
                  {topItems.map(([item, count], index) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-amber-600 text-amber-100' :
                        'bg-base-200 text-base-content'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate">{item}</span>
                      <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">{count} requests</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User Statistics */}
          <div className="bg-base-100 rounded-lg p-6 text-base-content">
            <h2 className="text-lg font-semibold mb-4">User Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-base-200 rounded-lg">
                <div className="text-3xl font-bold text-purple-500">{adminUsers}</div>
                <div className="text-sm text-base-content/60">Admins</div>
              </div>
              <div className="text-center p-4 bg-base-200 rounded-lg">
                <div className="text-3xl font-bold text-blue-500">{studentUsers}</div>
                <div className="text-sm text-base-content/60">Students</div>
              </div>
              <div className="text-center p-4 bg-base-200 rounded-lg">
                <div className="text-3xl font-bold text-yellow-500">{pendingAdminRequests}</div>
                <div className="text-sm text-base-content/60">Pending Admin Requests</div>
              </div>
              <div className="text-center p-4 bg-base-200 rounded-lg">
                <div className="text-3xl font-bold">{totalUsers}</div>
                <div className="text-sm text-base-content/60">Total Users</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-base-100 rounded-lg p-6 text-base-content">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <a href="/admindashboard" className="btn btn-primary">View Requests</a>
              <a href="/inventory" className="btn btn-secondary">Manage Inventory</a>
              <a href="/admin/users" className="btn btn-accent">Manage Users</a>
              <a href="/admin/accountabilities" className="btn btn-outline">View Accountabilities</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="bg-base-100 rounded-lg p-6 text-base-content">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-base-content/60 mb-1">{title}</div>
          <div className="text-3xl font-bold">{value}</div>
          {subtitle && <div className="text-xs text-base-content/50 mt-1">{subtitle}</div>}
        </div>
        <div className={`${color} p-3 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusBar({ label, value, total, color, icon }: {
  label: string
  value: number
  total: number
  color: string
  icon: React.ReactNode
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-sm font-medium">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-base-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
