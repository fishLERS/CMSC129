import React from "react";
import "./styling-request.css";

export function RequestForm() {
  return (
    <div>
      {/* Header */}
      <header>
        <h1>FishLERS</h1>
      </header>

      {/* Main Container */}
      <div id="main-container">
        {/* Left Panel */}
        <div id="left-panel">
          <div className="top-header">
            <h1>Available Lab Equipment</h1>

            <div className="filter"></div>
          </div>

          <div className="equipment-box">
            <h1>equipment...</h1>
          </div>

          <div className="total-box">
            <h1>Total No. of Items:</h1>
          </div>
        </div>

        {/* Right Panel */}
        <div id="right-panel">
          <h1>NEW REQUEST FORM</h1>

          <form>
            <div className="form-box">
              <div className="usage-date">
                <label>Date of Usage</label>
                <br />
                <input type="date" name="date" placeholder="mm/dd/yyyy" />
                <br />
              </div>

              <div className="time">
                <label>Start Time:</label>
                <input type="time" name="start" />
                <br />

                <label>End Time:</label>
                <input type="time" name="end" />
                <br />
              </div>

              <div className="adviser">
                <label>Adviser/Project Leader</label>
                <br />
                <input
                  type="text"
                  name="proj-leader"
                  placeholder="Enter Adviser/Project Leader"
                />
                <br />
              </div>

              <div className="purpose">
                <label>Purpose</label>
                <br />
                <input
                  type="text"
                  name="purpose-box"
                  placeholder="Enter Purpose of Usage"
                />
              </div>

              <div className="request-summary">
                <label>Request Summary</label>

                <div className="req-box">
                  <p>request</p>
                </div>
              </div>

              <button className="request-btn" type="submit">
                Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestForm;