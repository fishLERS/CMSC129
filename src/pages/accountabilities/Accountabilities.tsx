import React from 'react'
import Sidebar from '../../sidebar'
import './Accountabilities.css'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'

export default function Accountabilities(){
  const { user } = useAuth()
  const [rows, setRows] = React.useState<any[]>([])

  React.useEffect(()=>{
    if(!user) return
    const q = query(collection(db,'accountabilities'), where('createdBy','==', user.uid), orderBy('dueDate','asc'))
    const unsub = onSnapshot(q, snap => {
      const list: any[] = []
      snap.forEach(d => {
        const data: any = d.data()
        const due = data.dueDate?.toDate ? data.dueDate.toDate().toLocaleDateString() : (data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '')
        list.push({ id: d.id, due, details: data.details || '', status: data.status || '' })
      })
      setRows(list)
    })
    return ()=>unsub()
  },[user])

  return (
    <div className="accountabilities-page min-h-screen">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <main className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Accountabilities</h1>

          <section className="border border-base-300 rounded-md bg-base-100 p-4">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Date Due</th>
                    <th>Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={3} className="text-center text-base-content/60 py-6">No accountabilities</td></tr>
                  )}

                  {rows.map(r => (
                    <tr key={r.id}>
                      <td>{r.due}</td>
                      <td>{r.details}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
