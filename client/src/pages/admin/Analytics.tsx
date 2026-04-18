import React from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
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
  displayName?: string
  email?: string
}

export default function Analytics() {
  const [loading, setLoading] = React.useState(true)
  const [requests, setRequests] = React.useState<RequestData[]>([])
  const [equipment, setEquipment] = React.useState<EquipmentData[]>([])
  const [users, setUsers] = React.useState<UserData[]>([])

  React.useEffect(() => {
    setLoading(true)
    let cancelled = false
    ;(async () => {
      try {
        const [requestsSnap, equipmentSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(200))),
          getDocs(collection(db, 'equipment')),
          getDocs(collection(db, 'users')),
        ])

        if (cancelled) return

        setRequests(
          requestsSnap.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              status: data.status || 'unknown',
              createdAt: data.createdAt,
              createdAtClient: data.createdAtClient,
              createdBy: data.createdBy || '',
              purpose: data.purpose || '',
              items: data.items || [],
            } as RequestData
          })
        )

        setEquipment(
          equipmentSnap.docs.map((doc) => {
            const data = doc.data()
            return {
              equipmentID: doc.id,
              name: data.name || '',
              totalInventory: data.totalInventory || 0,
              category: data.category || 'Uncategorized',
              isDisposable: data.isDisposable || false,
            } as EquipmentData
          })
        )

        setUsers(
          usersSnap.docs.map((doc) => {
            const data = doc.data()
            return {
              uid: doc.id,
              role: data.role || 'student',
              createdAt: data.createdAt,
              requestedAdmin: data.requestedAdmin || false,
              displayName: data.displayName || '',
              email: data.email || '',
            } as UserData
          })
        )
      } catch (error) {
        console.error('Failed to load analytics data', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

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
  const userDisplayNameById = React.useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((user) => {
      if (!user.uid) return
      map[user.uid] = user.displayName || user.email || user.uid
    })
    return map
  }, [users])
  const resolveRequesterName = React.useCallback(
    (userId?: string) => {
      if (!userId) return 'Unknown user'
      return userDisplayNameById[userId] || userId
    },
    [userDisplayNameById]
  )

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

  const totalItemsRequested = requests.reduce((sum, req) => {
    if (!Array.isArray(req.items)) return sum
    return (
      sum +
      req.items.reduce((inner, item: any) => {
        if (!item) return inner
        if (typeof item === 'number') return inner + item
        if (typeof item === 'string') return inner + 1
        if (typeof item === 'object') {
          if (typeof item.qty === 'number') return inner + item.qty
          if (typeof item.quantity === 'number') return inner + item.quantity
        }
        return inner + 1
      }, 0)
    )
  }, 0)

  const avgItemsPerRequest = totalRequests > 0 ? totalItemsRequested / totalRequests : 0
  const disposablePercentage = totalEquipment > 0 ? Math.round((disposableItems / totalEquipment) * 100) : 0
  const reusablePercentage = totalEquipment > 0 ? Math.round((reusableItems / totalEquipment) * 100) : 0

  const requesterUsage: Record<string, number> = {}
  requests.forEach((req) => {
    const key = req.createdBy || 'Unknown'
    requesterUsage[key] = (requesterUsage[key] || 0) + 1
  })
  const topRequesterEntry = Object.entries(requesterUsage).sort((a, b) => b[1] - a[1])[0]

  const categoryDiversityScore = (() => {
    const counts = Object.values(equipmentByCategory)
    const total = counts.reduce((sum, count) => sum + count, 0)
    if (!total || counts.length <= 1) {
      return counts.length === 0 ? 0 : 100
    }
    const entropy = counts.reduce((acc, count) => {
      const probability = count / total
      return probability > 0 ? acc - probability * Math.log2(probability) : acc
    }, 0)
    const normalized = entropy / Math.log2(counts.length)
    return Math.round(normalized * 100)
  })()

  const recentRequests = requests
    .slice()
    .sort(
      (a, b) =>
        getTimestampValue(b.createdAtClient || b.createdAt) - getTimestampValue(a.createdAtClient || a.createdAt)
    )
    .slice(0, 5)

  const statusBadgeVariant = (status: string | undefined) => {
    const normalized = (status || '').toLowerCase()
    if (normalized === 'approved') return 'badge-success'
    if (normalized === 'declined' || normalized === 'rejected') return 'badge-error'
    if (normalized === 'returned') return 'badge-info'
    if (normalized === 'cancelled') return 'badge-neutral'
    return 'badge-warning'
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col items-center justify-center gap-4 h-72">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-base-content/70 text-sm">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-base-content/70">Track requests, equipment, and user activity at a glance.</p>
      </div>

      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div className="stat-title">Total Requests</div>
          <div className="stat-value">{totalRequests}</div>
          
        </div>
        <div className="stat">
          <div className="stat-figure text-secondary">
            <Package className="w-8 h-8" />
          </div>
          <div className="stat-title">Equipment Records</div>
          <div className="stat-value">{totalEquipment}</div>
          
        </div>
        <div className="stat">
          <div className="stat-figure text-accent">
            <Users className="w-8 h-8" />
          </div>
          <div className="stat-title">Total Users</div>
          <div className="stat-value">{totalUsers}</div>
          
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            {approvalRate >= 50 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
          </div>
          <div className="stat-title">Approval Rate</div>
          <div className="stat-value">{approvalRate}%</div>
          
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Request Status Breakdown</h2>
            <div className="space-y-3">
              <StatusBar label="Pending/Ongoing" value={pendingRequests} total={totalRequests} color="bg-warning" icon={<Clock className="w-4 h-4" />} />
              <StatusBar label="Approved" value={approvedRequests} total={totalRequests} color="bg-success" icon={<CheckCircle className="w-4 h-4" />} />
              <StatusBar label="Declined" value={declinedRequests} total={totalRequests} color="bg-error" icon={<XCircle className="w-4 h-4" />} />
              <StatusBar label="Returned" value={returnedRequests} total={totalRequests} color="bg-info" icon={<Package className="w-4 h-4" />} />
              <StatusBar label="Cancelled" value={cancelledRequests} total={totalRequests} color="bg-neutral" icon={<AlertCircle className="w-4 h-4" />} />
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Requests Over Time</h2>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body space-y-4">
            <h2 className="card-title text-lg">Equipment by Category</h2>
            {Object.keys(equipmentByCategory).length === 0 ? (
              <div className="text-base-content/60">No equipment data available</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(equipmentByCategory).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span>{category}</span>
                    <span className="badge badge-outline">{count}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-base-300 mt-3 text-sm text-base-content/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Disposable items</span>
                    <span>{disposableItems}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reusable items</span>
                    <span>{reusableItems}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body space-y-4">
            <h2 className="card-title text-lg">Most Requested Items</h2>
            {topItems.length === 0 ? (
              <div className="text-base-content/60">No request data available</div>
            ) : (
              <div className="space-y-3">
                {topItems.map(([item, count], index) => (
                  <div key={item} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? "bg-warning text-warning-content"
                          : index === 1
                          ? "bg-neutral text-neutral-content"
                          : index === 2
                          ? "bg-primary text-primary-content"
                          : "bg-base-300 text-base-content"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate">{item}</span>
                    <span className="badge badge-primary badge-outline">{count} requests</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-4">
          <h2 className="card-title text-lg">User Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat bg-base-100 rounded-box">
              <div className="stat-title">Admins</div>
              <div className="stat-value text-secondary">{adminUsers}</div>
              
            </div>
            <div className="stat bg-base-100 rounded-box">
              <div className="stat-title">Students</div>
              <div className="stat-value text-primary">{studentUsers}</div>
              
            </div>
            <div className="stat bg-base-100 rounded-box">
              <div className="stat-title">Pending Admin</div>
              <div className="stat-value text-warning">{pendingAdminRequests}</div>
              
            </div>
            <div className="stat bg-base-100 rounded-box">
              <div className="stat-title">Total Users</div>
              <div className="stat-value">{totalUsers}</div>
              
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-4">
          <h2 className="card-title text-lg">Data Scientist Insights</h2>
          <p className="text-sm text-base-content/70">
            These aggregates refresh in real time to support forecasting, anomaly detection, and other applied analytics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="stat bg-base-100 rounded-box">
              <div className="stat-title">Avg Items / Request</div>
              <div className="stat-value text-primary">{avgItemsPerRequest.toFixed(1)}</div>
              
            </div>
            <div className="stat bg-base-100 rounded-box">
              <div className="stat-title">Disposable Mix</div>
              <div className="stat-value text-secondary">{disposablePercentage}%</div>
              
            </div>
            <div className="stat bg-base-100 rounded-box">
              <div className="stat-title">Top Requester</div>
              <div className="stat-value text-accent">
                {topRequesterEntry ? resolveRequesterName(topRequesterEntry[0]) : 'N/A'}
              </div>
              
            </div>
            <div className="stat bg-base-100 rounded-box">
              <div className="stat-title">Category Diversity</div>
              <div className="stat-value text-info">{categoryDiversityScore}%</div>
              
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-4">
          <h2 className="card-title text-lg">Realtime Request Feed</h2>
          {recentRequests.length === 0 ? (
            <div className="text-base-content/60">No requests recorded yet.</div>
          ) : (
            <ul className="space-y-3">
              {recentRequests.map((req) => (
                <li key={req.id} className="flex flex-col gap-1 border border-base-300 rounded-box p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">{resolveRequesterName(req.createdBy)}</span>
                    <span className={`badge ${statusBadgeVariant(req.status)}`}>
                      {req.status || 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-base-content/70 truncate">{req.purpose || 'No purpose specified'}</p>
                  <div className="text-xs text-base-content/60 flex items-center justify-between">
                    <span>{req.items?.length || 0} items</span>
                    <span>{formatDateTime(req.createdAtClient || req.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-4">
          <h2 className="card-title text-lg">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a href="/admindashboard" className="btn btn-primary">
              View Requests
            </a>
            <a href="/inventory" className="btn btn-secondary">
              Manage Inventory
            </a>
            <a href="/admin/users" className="btn btn-accent">
              Manage Users
            </a>
            <a href="/admin/accountabilities" className="btn btn-outline">
              View Accountabilities
            </a>
          </div>
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

function getTimestampValue(value: any): number {
  const date = resolveDate(value)
  return date ? date.getTime() : 0
}

function formatDateTime(value: any): string {
  const date = resolveDate(value)
  return date ? date.toLocaleString() : 'Unknown'
}

function resolveDate(value: any): Date | null {
  if (!value) return null
  try {
    if (typeof value?.toDate === 'function') {
      const date = value.toDate()
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date
      }
    }
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  } catch (error) {
    return null
  }
}
