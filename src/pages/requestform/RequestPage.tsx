import React from "react";
import { logicEquipment, useFetchAvailableItems } from "../equipment/logicEquipment";

import { db, auth } from "../../firebase";
import { useAuth } from '../../hooks/useAuth'
import { collection, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, User, FileText, Package, Plus, Minus, Search, Send } from 'lucide-react';

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
  const [calendarKey, setCalendarKey] = React.useState(0);
  const [filterText, setFilterText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
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

  const { availableEquipment, isFetching} = useFetchAvailableItems(
    equipmentList,
    formData.startDate,
    formData.endDate
  );

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
    for (const { equipmentID, qty } of itemsArray) {
      const item = availableEquipment.find((e) => e.equipmentID === equipmentID);
      if (!item) continue;
      if (qty > item.available) {
        alert(`"${item.name}" exceeds available stock (${item.available}).`);
        return;
      }
    }

    if (itemsArray.length === 0) {
      alert("Please select at least one item.");
      return;
    }

    setIsSubmitting(true);
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
        status: 'pending',
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter equipment list
  const filteredEquipment = availableEquipment.filter(item => 
    item.name?.toLowerCase().includes(filterText.toLowerCase()) ||
    item.category?.toLowerCase().includes(filterText.toLowerCase())
  );

  // Calculate totals
  const totalItems = Object.values(requestedItems).reduce((a, b) => a + b, 0);
  const selectedItems = Object.entries(requestedItems).filter(([_, qty]) => qty > 0);

  return (
    <div className="p-6">
      {/* Inject CSS to remove number arrows */}
      <style>{removeStepper}</style>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Equipment Request</h1>
        <p className="text-base-content/70">Select equipment and fill in the request details</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT PANEL - Equipment Selection */}
        <div className="flex-1">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body p-4">
              {/* Header with search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="card-title text-lg">
                  <Package className="w-5 h-5" />
                  Available Equipment
                </h2>
                <div className="join">
                  <div className="join-item bg-base-300 flex items-center px-3">
                    <Search className="w-4 h-4 text-base-content/60" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search equipment..."
                    className="input input-sm input-bordered join-item w-full sm:w-48"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
              </div>

              {/* Equipment List */}
              <div className="bg-base-100 rounded-lg border border-base-300 h-[400px] overflow-y-auto">
                {filteredEquipment.length === 0 ? (
                  <div className="p-8 text-center text-base-content/60">
                    No equipment found
                  </div>
                ) : (
                  <div className="divide-y divide-base-200">
                    {filteredEquipment.map((item) => (
                      <div
                        key={item.equipmentID}
                        className={`flex justify-between items-center p-3 hover:bg-base-200/50 transition-colors ${
                          (requestedItems[item.equipmentID!] || 0) > 0 ? 'bg-primary/5' : ''
                        }`}
                      >
                        {/* Item Info */}
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge badge-ghost badge-sm">
                              Available: {item.available}
                            </span>
                            {item.category && (
                              <span className="badge badge-outline badge-sm">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="join">
                          <button
                            type="button"
                            className="btn btn-sm join-item"
                            onClick={() =>
                              setRequestedItems((prev) => ({
                                ...prev,
                                [item.equipmentID!]: Math.max((prev[item.equipmentID!] || 0) - 1, 0),
                              }))
                            }
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={requestedItems[item.equipmentID!] || 0}
                            onChange={(e) =>
                              setRequestedItems((prev) => ({
                                ...prev,
                                [item.equipmentID!]: Math.max(0, Number(e.target.value)),
                              }))
                            }
                            className="input input-sm input-bordered join-item w-14 text-center"
                          />
                          <button
                            type="button"
                            className="btn btn-sm join-item"
                            onClick={() =>
                              setRequestedItems((prev) => ({
                                ...prev,
                                [item.equipmentID!]: (prev[item.equipmentID!] || 0) + 1,
                              }))
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Selected Stats */}
              <div className="stats bg-base-300 shadow mt-4">
                <div className="stat py-2 px-4">
                  <div className="stat-title text-xs">Items Selected</div>
                  <div className="stat-value text-lg">{selectedItems.length}</div>
                </div>
                <div className="stat py-2 px-4">
                  <div className="stat-title text-xs">Total Quantity</div>
                  <div className="stat-value text-lg text-primary">{totalItems}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Request Form */}
        <div className="w-full lg:w-96">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body p-4">
              <h2 className="card-title text-lg justify-center mb-2">
                <FileText className="w-5 h-5" />
                Request Details
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date Range */}
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date of Usage
                    </span>
                  </label>
                  <div className="relative" ref={dateCalendarRef}>
                    <input type="hidden" name="startDate" value={formData.startDate} required />
                    <input type="hidden" name="endDate" value={formData.endDate} required />
                    <button
                      type="button"
                      className={`btn btn-sm w-full justify-between font-normal ${
                        formData.startDate && formData.endDate ? '' : 'text-base-content/50'
                      }`}
                      onClick={() => setShowDateCalendar(!showDateCalendar)}
                    >
                      <span>
                        {formData.startDate && formData.endDate
                          ? `${formatDateDisplay(formData.startDate)} — ${formatDateDisplay(formData.endDate)}`
                          : formData.startDate
                          ? `${formatDateDisplay(formData.startDate)} — Select end`
                          : 'Select date range'}
                      </span>
                      <Calendar className="w-4 h-4" />
                    </button>
                    {showDateCalendar && (
                      <div className="absolute z-50 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl p-3 right-0">
                        <div className="text-xs font-medium mb-2 text-center text-base-content/70">
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
                        <div className="flex gap-2 mt-3 pt-3 border-t border-base-300">
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost flex-1"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, startDate: '', endDate: '' }));
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
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Start Time
                      </span>
                    </label>
                    <input
                      type="time"
                      name="start"
                      className="input input-sm input-bordered w-full"
                      onChange={handleInput}
                      min={isStartDateToday() ? getCurrentTime() : undefined}
                      value={formData.start}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Return Time
                      </span>
                    </label>
                    <input
                      type="time"
                      name="end"
                      className="input input-sm input-bordered w-full"
                      onChange={handleInput}
                      min={formData.startDate === formData.endDate && isStartDateToday() ? getCurrentTime() : undefined}
                      value={formData.end}
                      required
                    />
                  </div>
                </div>

                {/* Adviser */}
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Adviser / Project Leader
                    </span>
                  </label>
                  <input
                    type="text"
                    name="adviser"
                    className="input input-sm input-bordered w-full"
                    placeholder="Enter name"
                    onChange={handleInput}
                    value={formData.adviser}
                    required
                  />
                </div>

                {/* Purpose */}
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Purpose
                    </span>
                  </label>
                  <input
                    type="text"
                    name="purpose"
                    className="input input-sm input-bordered w-full"
                    placeholder="Enter purpose of usage"
                    onChange={handleInput}
                    value={formData.purpose}
                    required
                  />
                </div>

                {/* Request Summary */}
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-medium">Request Summary</span>
                    <span className="label-text-alt">{selectedItems.length} items</span>
                  </label>
                  <div className="bg-base-100 border border-base-300 rounded-lg h-24 overflow-y-auto">
                    {selectedItems.length === 0 ? (
                      <div className="p-3 text-sm text-base-content/50 text-center">
                        No items selected
                      </div>
                    ) : (
                      <div className="divide-y divide-base-200">
                        {selectedItems.map(([id, qty]) => {
                          const item = equipmentList.find((e) => e.equipmentID === id);
                          if (!item) return null;
                          return (
                            <div key={id} className="flex justify-between items-center px-3 py-2 text-sm">
                              <span>{item.name}</span>
                              <span className="badge badge-primary badge-sm">{qty} pcs</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  className="btn btn-primary btn-block gap-2"
                  disabled={isSubmitting || selectedItems.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Request
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestForm;