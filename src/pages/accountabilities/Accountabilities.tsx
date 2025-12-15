import React from 'react'
import Sidebar from '../../sidebar'
import '/src/index.css'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'

export default function Accountabilities(){
  const { user } = useAuth()
  const [rows, setRows] = React.useState<any[]>([])

  React.useEffect(()=>{
    if(!user) return
    const processSnapshot = (snap: any) => {
      console.info('Accountabilities snapshot count:', snap.size)
      const list: any[] = []
      snap.forEach((d: any) => {
        const data: any = d.data()
        const due = data.dueDate?.toDate ? data.dueDate.toDate().toLocaleDateString() : (data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '')
        list.push({ id: d.id, due, details: data.details || '', status: data.status || '' })
      })
      setRows(list)
    }

    let unsubMain: (() => void) | null = null
    let unsubFallback: (() => void) | null = null
    try {
      const q = query(collection(db,'accountabilities'), where('createdBy','==', user.uid), orderBy('dueDate','asc'))
      unsubMain = onSnapshot(q, (snap) => processSnapshot(snap), (err) => {
        console.error('Accountabilities snapshot error', err)
        try {
          const qf = query(collection(db,'accountabilities'), where('createdBy','==', user.uid))
          unsubFallback = onSnapshot(qf, (snap) => processSnapshot(snap), (err2) => console.error('Accountabilities fallback error', err2))
        } catch (e) {
          console.error('Failed to subscribe accountabilities fallback', e)
        }
      })
    } catch (e) {
      console.error('Failed to subscribe accountabilities main', e)
      const qf = query(collection(db,'accountabilities'), where('createdBy','==', user.uid))
      unsubFallback = onSnapshot(qf, (snap) => processSnapshot(snap), (err2) => console.error('Accountabilities fallback error', err2))
    }

    return () => { if (unsubMain) unsubMain(); if (unsubFallback) unsubFallback() }
  },[user])

  return (
    <div className="relative accountabilities-page min-h-screen overflow-hidden">
      <svg
        className="absolute"
        viewBox="0 0 1440 705"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#74AAF0"
          fillOpacity="1"
          d="M 0 0 L 0 294 C 16 417 42 258 143 381 C 176 427 249 288 319 324 C 380 355 430 441 610 460 C 840 475 926 428 1036 437 C 1130 444 1211 503 1259 448 C 1309 395 1316 525 1440 411 L 1440 0 00Z"
        ></path>
      </svg> 
    <svg
        className="absolute"
        viewBox="0 0 1440 705"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#5091E5"
          fillOpacity="1"
          d="M 0 0 L 0 106 C 14 174 62 154 102 196 C 146 233 212 256 287 273 C 383 290 672 292 762 249 C 843 204 989 143 1053 206 C 1114 269 1336 360 1440 324 L 1440 0 00Z"
        ></path>
      </svg> 
      <Sidebar />
      <div className="flex-1 z-50" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <main className="p-6 z-50">
          <h1 className="relative text-2xl font-semibold mb-4 z-50">Accountabilities</h1>

          <section className="relative rounded-xl bg-main-4 p-1 z-90 opacity-80">
            <div className="overflow-x-auto z-90 text-black">
              <table className="table w-full z-90 text-black">
                <thead className='text-black'>
                  <tr>
                    <th>Date Due</th>
                    <th>Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={3} className="text-center text-base-content/60 py-6 z-90 text-black">No accountabilities</td></tr>
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
