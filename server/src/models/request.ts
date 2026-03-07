/**
 * Request Model
 * Domain model for equipment reservation requests.
 */
export interface RequestItem {
  equipmentID: string;
  qty: number;
  notes?: string;
}

export interface Request {
  requestID?: string;
  userID: string; // Who requested it
  items: RequestItem[]; // Equipment being requested
  status: "pending" | "approved" | "rejected" | "ongoing" | "returned" | "completed";
  startDate: string; // ISO date
  endDate: string; // ISO date
  purpose?: string; // Reason for borrowing
  approvedBy?: string; // Admin UID who approved
  approvedAt?: string; // ISO timestamp
  rejectionReason?: string; // Why it was rejected
  returnedAt?: string; // When equipment was returned
  createdAt?: string;
  updatedAt?: string;
}

/**
 * What can be created/updated
 */
export type RequestCreateInput = Omit<Request, "requestID" | "createdAt" | "updatedAt" | "approvedBy" | "approvedAt" | "rejectionReason" | "returnedAt">;

export type RequestUpdateInput = Partial<RequestCreateInput>;

/**
 * Admin approval/rejection payload
 */
export interface RequestApprovalPayload {
  approved: boolean;
  reason?: string; // Rejection reason if rejected
}

/**
 * Request with user info (for responses)
 */
export interface RequestWithUser extends Request {
  user?: {
    email: string;
    displayName?: string;
  };
}
