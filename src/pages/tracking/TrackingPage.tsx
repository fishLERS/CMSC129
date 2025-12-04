import React from 'react'
import Sidebar from '../../sidebar'
import './TrackingPage.css'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { logicEquipment } from '../equipment/logicEquipment'

export default function TrackingPage(){
  const { user } = useAuth()
  const { equipmentList } = logicEquipment()
  const [rows, setRows] = React.useState<Array<any>>([])

  React.useEffect(()=>{
    if(!user) return
    const q = query(collection(db,'requests'), where('createdBy','==', user.uid), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, snap => {
      const allRows: any[] = []
      snap.forEach(doc => {
        const data: any = doc.data()
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : (data.createdAt ? new Date(data.createdAt).toLocaleString() : '')
        const requestId = doc.id
        const status = data.status || ''
        const remarks = data.purpose || ''
        const items = Array.isArray(data.items) ? data.items : []
        items.forEach((it:any)=>{
          const equipment = equipmentList.find((e:any)=>e.equipmentID===it.equipmentID)
          allRows.push({
            equipment: equipment?.name || it.equipmentID,
            requestId,
            date: createdAt,
            status,
            remarks
          })
        })
      })
      setRows(allRows)
    })
    return ()=>unsub()
  },[user, equipmentList])

  return (
    <div className="tracking-page min-h-screen">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: 'var(--sidebar-width)' }}>

        <main className="p-6">
          <h1 className="text-xl font-semibold mb-4">Tracking</h1>

          <section className="border border-base-300 rounded-md bg-base-100 p-4">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Request ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length===0 && (
                    <tr><td colSpan={5} className="text-center text-base-content/60 py-6">No requests yet</td></tr>
                  )}
                  {rows.map((r, idx)=> (
                    <tr key={idx}>
                      <td>{r.equipment}</td>
                      <td>{r.requestId}</td>
                      <td>{r.date}</td>
                      <td>{r.status}</td>
                      <td>{r.remarks}</td>
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
