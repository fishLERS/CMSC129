import React from "react";

export const RequestForm: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <header className="w-full bg-base-200 border-b border-base-300 px-4 py-2">
      </header>

      {/* Main Container */}
      <div className="mt-4 px-6 flex gap-6 items-start">
        {/* Left Panel */}
        <section className="flex-1 space-y-3">
          {/* Top header + filter */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Available Lab Equipment</h1>
            <div className="flex items-center gap-2">
              {/* Placeholder filter – you can wire this up later */}
              <input
                type="text"
                placeholder="Filter equipment"
                className="input input-sm input-bordered"
              />
            </div>
          </div>

          {/* Equipment list box */}
          <div className="border border-base-300 rounded-md bg-base-100 h-[418px] overflow-y-auto p-3">
            <h2 className="font-medium text-base-content/70 mb-2">
              equipment...
            </h2>
            {/* Render equipment list here later */}
          </div>

          {/* Total box */}
          <div className="border border-base-300 rounded-md bg-base-100 px-3 py-2">
            <h2 className="font-medium text-base-content">
              Total No. of Items:
            </h2>
          </div>
        </section>

        {/* Right Panel */}
        <section className="w-[355px]">
          <h1 className="text-lg font-semibold mb-3 text-center">
            NEW REQUEST FORM
          </h1>

          <form>
            <div className="border border-base-300 rounded-md bg-base-100 p-4 h-[500px] flex flex-col justify-between">
              <div className="space-y-3">
                {/* Date of Usage */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Date of Usage</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    className="input input-bordered input-sm w-full"
                  />
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Start Time</span>
                    </label>
                    <input
                      type="time"
                      name="start"
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">End Time</span>
                    </label>
                    <input
                      type="time"
                      name="end"
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>

                {/* Adviser / Project Leader */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Adviser/Project Leader
                    </span>
                  </label>
                  <input
                    type="text"
                    name="proj-leader"
                    placeholder="Enter Adviser/Project Leader"
                    className="input input-bordered input-sm w-full"
                  />
                </div>

                {/* Purpose */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Purpose</span>
                  </label>
                  <input
                    type="text"
                    name="purpose-box"
                    placeholder="Enter Purpose of Usage"
                    className="input input-bordered input-sm w-full"
                  />
                </div>

                {/* Request Summary */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Request Summary
                    </span>
                  </label>
                  <div className="border border-base-300 rounded-md bg-base-100 h-[100px] px-3 py-2 overflow-y-auto">
                    <p className="text-sm text-base-content/70">request</p>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <button
                className="btn btn-primary btn-block mt-4"
                type="submit"
              >
                Request
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default RequestForm;