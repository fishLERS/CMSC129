import React from "react";
import Sidebar from '../../sidebar'
import '/src/index.css'
import { logicEquipment } from "../equipment/logicEquipment";

import { db, auth } from "../../firebase";
import { useAuth } from '../../hooks/useAuth'
import { collection, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom'

// REMOVE NUMBER INPUT ARROWS (Chrome, Edge, Safari)
const removeStepper = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`;

export const RequestForm: React.FC = () => {
  const { equipmentList } = logicEquipment();
  const { user } = useAuth()

  const navigate = useNavigate()

  const [requestedItems, setRequestedItems] = React.useState<{ [id: string]: number }>({});

  const [formData, setFormData] = React.useState({
    startDate: "",
    endDate: "",
    start: "",
    end: "",
    adviser: "",
    purpose: "",
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsArray = Object.entries(requestedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([equipmentID, qty]) => ({ equipmentID, qty }));

    if (itemsArray.length === 0) {
      alert("Please select at least one item.");
      return;
    }

    try {
      // prefer authenticated user from the auth hook (keeps behaviour consistent across renders)
      const currentUser = user || auth.currentUser
      if (!currentUser) {
        alert('You must be signed in to submit a request');
        return;
      }

      const docRef = await addDoc(collection(db, "requests"), {
        ...formData,
        items: itemsArray,
        // server timestamp for canonical ordering, plus a client timestamp fallback
        createdAt: serverTimestamp(),
        createdAtClient: new Date().toISOString(),
        createdBy: currentUser.uid,
        status: 'ongoing',
      });

      // read back the created document to verify write and server timestamp resolution
      try {
        const snap = await getDoc(docRef);
        console.info('Request created:', docRef.id, snap.exists() ? snap.data() : null);
        // persist last created id for quick debugging / tracking view
        try { localStorage.setItem('lastRequestId', docRef.id) } catch (e) { /* ignore */ }
      } catch (e) {
        console.warn('Could not read back created request immediately', e);
      }

      // clear local form state and show confirmation
      setRequestedItems({})
      setFormData({ startDate: "", endDate: "", start: "", end: "", adviser: "", purpose: "" })
      alert("Request submitted!")
      // navigate to tracking so user can see the created request
      navigate('/tracking')
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Something went wrong.");
    }
  };

  return (
  <div className="relative request-page min-h-screen over overflow-hidden">
    <svg
        className="absolute z-0"
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
        className="absolute z-0"
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
    <div className="flex-1" style={{ marginLeft: 'var(--sidebar-width)' }}>

      {/* Inject CSS to remove number arrows */}
      <style>{removeStepper}</style>

      {/* HEADER */}
      <header className="w-full bg-base-200 border-b border-base-300 px-4 py-2"></header>

      {/* MAIN */}
      <div className="mt-4 px-6 flex gap-6 items-start z-90">

        {/* LEFT PANEL */}
        <section className="flex-1 space-y-3 z-90">

          {/* EQUIPMENT LIST */}
          <div className="flex flex-row items-center justify-start h-15 bg-main-4 m-0 px-4 rounded-t-xl opacity-80">
              <h1 className="text-lg text-black font-bold">Available Lab Equipment</h1>
              <input
                type="text"
                placeholder="Filter equipment"
                className="input input-sm input-bordered ml-auto rounded-lg bg-white text-black focus:outline-none focus:ring-1 focus:ring-dark"
              />
          </div>
          <div className="rounded-b-xl bg-white h-[550px] overflow-y-auto px-3 opacity-80 ">
            {equipmentList.map((item) => (
              <div
                key={item.equipmentID}
                className="flex justify-between items-center border-b py-2 "
              >
                {/* Item Info */}
                <div>
                  <p className="font-semibold text-black">{item.name}</p>
                  <p className="text-sm t text-black">
                    Quantity Available: {item.totalInventory}
                  </p>
                  {item.category && (
                    <p className="text-xs  text-black">
                      Category: {item.category}
                    </p>
                  )}
                </div>

                {/* STEPPER NO ARROWS */}
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-xs bg-main-1 border-0"
                    onClick={() =>
                      setRequestedItems((prev) => ({
                        ...prev,
                        [item.equipmentID!]: Math.max((prev[item.equipmentID!] || 0) - 1, 0),
                      }))
                    }
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min={0}
                    value={requestedItems[item.equipmentID!] || 0}
                    onChange={(e) =>
                      setRequestedItems((prev) => ({
                        ...prev,
                        [item.equipmentID!]: Number(e.target.value),
                      }))
                    }
                    className="input input-bordered input-xs w-12 text-center bg-main-5 text-black"
                  />

                  <button
                    className="btn btn-xs bg-main-1 border-0"
                    onClick={() =>
                      setRequestedItems((prev) => ({
                        ...prev,
                        [item.equipmentID!]: (prev[item.equipmentID!] || 0) + 1,
                      }))
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* TOTAL SELECTED */}
          <div className="rounded-xl bg-white px-3 py-2 z-90 opacity-80">
            <h2 className="font-medium text-black">
              Total No. of Items:{" "}
              {Object.values(requestedItems).reduce((a, b) => a + b, 0)}
            </h2>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="w-[355px] z-90">

          <form onSubmit={handleSubmit} className="bg-main-4 opacity-80 rounded-xl">
            <div className="p-4 h-[565px] flex flex-col gap-1">
              <h1 className="text-lg font-extrabold mb-2 text-black">
                NEW REQUEST FORM
              </h1>

              <div className="space-y-3">

                {/* DATE RANGE */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-black">Date of Usage</span>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">
                        <span className="label-text text-xs text-black">Start Date</span>
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        className="input input-bordered input-sm w-full bg-white text-black [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 focus:outline-none focus:ring-1 focus:ring-dark"
                        onChange={handleInput}
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text text-xs text-black">Return Date</span>
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        className="input input-bordered input-sm w-full bg-white text-black [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 focus:outline-none focus:ring-1 focus:ring-dark"
                        onChange={handleInput}
                      />
                    </div>
                  </div>
                </div>

                {/* TIME RANGE */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-xs text-black">Start Time</span>
                    </label>
                    <input
                      type="time"
                      name="start"
                      className="input input-bordered input-sm w-full bg-white text-black [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 focus:outline-none focus:ring-1 focus:ring-dark"
                      onChange={handleInput}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-xs text-black">Return Time</span>
                    </label>
                    <input
                      type="time"
                      name="end"
                      className="input input-bordered input-sm w-full bg-white text-black [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 focus:outline-none focus:ring-1 focus:ring-dark"
                      onChange={handleInput}
                    />
                  </div>
                </div>

                {/* ADVISER */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-black">Adviser / Project Leader</span>
                  </label>
                  <input
                    type="text"
                    name="adviser"
                    className="input input-bordered input-sm w-full bg-white rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-dark"
                    placeholder="Enter Adviser/Project Leader"
                    onChange={handleInput}
                  />
                </div>

                {/* PURPOSE */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-black">Purpose</span>
                  </label>
                  <input
                    type="text"
                    name="purpose"
                    className="input input-bordered input-sm w-full bg-white rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-dark"
                    placeholder="Enter Purpose of Usage"
                    onChange={handleInput}
                  />
                </div>

                {/* REQUEST SUMMARY */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-black">Request Summary</span>
                  </label>

                  <div className="bg-white rounded-lg h-[100px] px-3 py-2 overflow-y-auto">
                    {Object.entries(requestedItems)
                      .filter(([_, qty]) => qty > 0)
                      .map(([id, qty]) => {
                        const item = equipmentList.find((e) => e.equipmentID === id);
                        if (!item) return null;
                        return (
                          <p key={id} className="text-sm text-black">
                            {item.name} — {qty} pcs
                          </p>
                        );
                      })}

                    {Object.values(requestedItems).every((q) => q === 0) && (
                      <p className="text-sm text-black">No items selected</p>
                    )}
                  </div>
                </div>

              </div>

              {/* SUBMIT BUTTON */}
              <button className="btn mt-4 border-none bg-main-1 rounded-xl font-bold hover:bg-main-2" type="submit">
                Complete Request
              </button>
            </div>
          </form>
        </section>
      </div>
      </div>
    </div>
  );
};

export default RequestForm;