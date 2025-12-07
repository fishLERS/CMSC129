import React from "react";
import Sidebar from '../../sidebar'
import './RequestPage.css'
import { logicEquipment } from "../equipment/logicEquipment";

import { db, auth } from "../../firebase";
import { useAuth } from '../../hooks/useAuth'
import { collection, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom'

// Import Cally calendar components
import 'cally';

// Declare custom elements for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'calendar-date': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { value?: string; min?: string }, HTMLElement>;
      'calendar-range': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { value?: string; min?: string }, HTMLElement>;
      'calendar-month': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

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
  const [showDateCalendar, setShowDateCalendar] = React.useState(false);
  const [calendarKey, setCalendarKey] = React.useState(0); // Key to force calendar remount
  const dateCalendarRef = React.useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateCalendarRef.current && !dateCalendarRef.current.contains(event.target as Node)) {
        setShowDateCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Handle range change from calendar-range component
  const handleRangeChange = (e: Event) => {
    const target = e.target as HTMLElement & { value: string };
    const value = target.value; // Format: "YYYY-MM-DD/YYYY-MM-DD" or "YYYY-MM-DD" if only start selected
    console.log('Calendar range value:', value);
    
    if (value.includes('/')) {
      // Both dates selected
      const [start, end] = value.split('/');
      console.log('Selected range:', { startDate: start, endDate: end });
      setFormData(prev => ({ ...prev, startDate: start, endDate: end }));
      // Close calendar after range is complete
      setShowDateCalendar(false);
    } else if (value) {
      // Only start date selected so far
      setFormData(prev => ({ ...prev, startDate: value, endDate: '' }));
    }
  };

  // Format date for display (YYYY-MM-DD to readable format)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  // Check if selected start date is today
  const isStartDateToday = () => {
    return formData.startDate === getTodayDate();
  };

  // Get min time for start time (only restrict if start date is today)
  const getMinStartTime = () => {
    return isStartDateToday() ? getCurrentTime() : undefined;
  };

  // Get the range value for the calendar
  const getCalendarRangeValue = () => {
    if (formData.startDate && formData.endDate) {
      return `${formData.startDate}/${formData.endDate}`;
    }
    return formData.startDate || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate date fields
    if (!formData.startDate) {
      alert("Please select a start date.");
      return;
    }
    if (!formData.endDate) {
      alert("Please select a return date.");
      return;
    }

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
      
      console.log('Submitted to Firebase with dates:', { startDate: formData.startDate, endDate: formData.endDate });

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

                  {/* Merged Date Range Picker */}
                  <div className="relative" ref={dateCalendarRef}>
                    <input
                      type="hidden"
                      name="startDate"
                      value={formData.startDate}
                      required
                    />
                    <input
                      type="hidden"
                      name="endDate"
                      value={formData.endDate}
                      required
                    />
                    <button
                      type="button"
                      className="input input-bordered input-sm w-full text-left flex items-center justify-between"
                      onClick={() => setShowDateCalendar(!showDateCalendar)}
                    >
                      <span className={formData.startDate && formData.endDate ? '' : 'text-base-content/50'}>
                        {formData.startDate && formData.endDate
                          ? `${formatDateDisplay(formData.startDate)} — ${formatDateDisplay(formData.endDate)}`
                          : formData.startDate
                          ? `${formatDateDisplay(formData.startDate)} — Select end date`
                          : 'Select date range'}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {showDateCalendar && (
                      <div className="absolute z-50 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg p-3">
                        {/* Range Calendar with highlighting */}
                        <div className="text-xs font-medium mb-2 text-center">
                          {formData.startDate && !formData.endDate ? 'Now select return date' : 'Select date range'}
                        </div>
                        <calendar-range
                          key={calendarKey}
                          value={getCalendarRangeValue()}
                          min={getTodayDate()}
                          ref={(el: HTMLElement | null) => {
                            if (el) {
                              el.removeEventListener('change', handleRangeChange);
                              el.addEventListener('change', handleRangeChange);
                            }
                          }}
                        >
                          <calendar-month></calendar-month>
                        </calendar-range>
                        {/* Clear and Today buttons */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-base-300">
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost flex-1"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, startDate: '', endDate: '' }));
                              // Force calendar to remount and clear highlights
                              setCalendarKey(prev => prev + 1);
                            }}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-primary flex-1"
                            onClick={() => {
                              const today = getTodayDate();
                              setFormData(prev => ({ ...prev, startDate: today, endDate: today }));
                              setShowDateCalendar(false);
                            }}
                          >
                            Today
                          </button>
                        </div>
                        {/* Selected range display */}
                        <div className="mt-2 text-xs text-center text-base-content/70">
                          {formData.startDate && formData.endDate
                            ? `Selected: ${formatDateDisplay(formData.startDate)} — ${formatDateDisplay(formData.endDate)}`
                            : formData.startDate
                            ? `Start: ${formatDateDisplay(formData.startDate)} — click end date`
                            : 'Click to select start date'}
                        </div>
                      </div>
                    )}
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
                      min={isStartDateToday() ? getCurrentTime() : undefined}
                      value={formData.start}
                      required
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
                      min={formData.startDate === formData.endDate && isStartDateToday() ? getCurrentTime() : undefined}
                      value={formData.end}
                      required
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
                    required
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
                    required
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