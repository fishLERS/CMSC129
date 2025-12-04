import React from "react";
import Sidebar from '../../sidebar'
import './RequestPage.css'
import { logicEquipment } from "../equipment/logicEquipment";

import { db, auth } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('You must be signed in to submit a request');
        return;
      }

      await addDoc(collection(db, "requests"), {
        ...formData,
        items: itemsArray,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        status: 'ongoing',
      });

      alert("Request submitted!");
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Something went wrong.");
    }
  };

  return (
  <div className="request-page min-h-screen">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: 'var(--sidebar-width)' }}>

      {/* Inject CSS to remove number arrows */}
      <style>{removeStepper}</style>

      {/* HEADER */}
      <header className="w-full bg-base-200 border-b border-base-300 px-4 py-2"></header>

      {/* MAIN */}
      <div className="mt-4 px-6 flex gap-6 items-start">

        {/* LEFT PANEL */}
        <section className="flex-1 space-y-3">

          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Available Lab Equipment</h1>
            <input
              type="text"
              placeholder="Filter equipment"
              className="input input-sm input-bordered"
            />
          </div>

          {/* EQUIPMENT LIST */}
          <div className="border border-base-300 rounded-md bg-base-100 h-[418px] overflow-y-auto p-3">

            {equipmentList.map((item) => (
              <div
                key={item.equipmentID}
                className="flex justify-between items-center border-b py-2"
              >
                {/* Item Info */}
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-base-content/70">
                    Quantity Available: {item.totalInventory}
                  </p>
                  {item.category && (
                    <p className="text-xs text-base-content/60">
                      Category: {item.category}
                    </p>
                  )}
                </div>

                {/* STEPPER NO ARROWS */}
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-xs"
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
                    className="input input-bordered input-xs w-12 text-center"
                  />

                  <button
                    className="btn btn-xs"
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
          <div className="border border-base-300 rounded-md bg-base-100 px-3 py-2">
            <h2 className="font-medium">
              Total No. of Items:{" "}
              {Object.values(requestedItems).reduce((a, b) => a + b, 0)}
            </h2>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="w-[355px]">

          <h1 className="text-lg font-semibold mb-3 text-center">
            NEW REQUEST FORM
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="border border-base-300 rounded-md bg-base-100 p-4 h-[500px] flex flex-col justify-between">

              <div className="space-y-3">

                {/* DATE RANGE */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Date of Usage</span>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">
                        <span className="label-text text-xs">Start Date</span>
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        className="input input-bordered input-sm w-full"
                        onChange={handleInput}
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text text-xs">Return Date</span>
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        className="input input-bordered input-sm w-full"
                        onChange={handleInput}
                      />
                    </div>
                  </div>
                </div>

                {/* TIME RANGE */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Start Time</span>
                    </label>
                    <input
                      type="time"
                      name="start"
                      className="input input-bordered input-sm w-full"
                      onChange={handleInput}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Return Time</span>
                    </label>
                    <input
                      type="time"
                      name="end"
                      className="input input-bordered input-sm w-full"
                      onChange={handleInput}
                    />
                  </div>
                </div>

                {/* ADVISER */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Adviser / Project Leader</span>
                  </label>
                  <input
                    type="text"
                    name="adviser"
                    className="input input-bordered input-sm w-full"
                    placeholder="Enter Adviser/Project Leader"
                    onChange={handleInput}
                  />
                </div>

                {/* PURPOSE */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Purpose</span>
                  </label>
                  <input
                    type="text"
                    name="purpose"
                    className="input input-bordered input-sm w-full"
                    placeholder="Enter Purpose of Usage"
                    onChange={handleInput}
                  />
                </div>

                {/* REQUEST SUMMARY */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Request Summary</span>
                  </label>

                  <div className="border border-base-300 rounded-md bg-base-100 h-[100px] px-3 py-2 overflow-y-auto">
                    {Object.entries(requestedItems)
                      .filter(([_, qty]) => qty > 0)
                      .map(([id, qty]) => {
                        const item = equipmentList.find((e) => e.equipmentID === id);
                        if (!item) return null;
                        return (
                          <p key={id} className="text-sm">
                            {item.name} — {qty} pcs
                          </p>
                        );
                      })}

                    {Object.values(requestedItems).every((q) => q === 0) && (
                      <p className="text-sm text-base-content/70">No items selected</p>
                    )}
                  </div>
                </div>

              </div>

              {/* SUBMIT BUTTON */}
              <button className="btn btn-primary btn-block mt-4" type="submit">
                Request
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