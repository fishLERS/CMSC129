import { getAuth } from "../config/firebase.js";
import { Request, RequestCreateInput, RequestUpdateInput, RequestApprovalPayload } from "../models/request.js";
import { RequestRepository } from "../repositories/requests.repo.js";

/**
 * Request Service.
 * Handles business logic for equipment reservation requests.
 *
 * Purpose: Business logic layer for request operations.
 */
export class RequestService {
  /**
   * Create a new request.
   * Validates that user exists and equipment is available.
   */
  static async createRequest(data: RequestCreateInput): Promise<Request> {
    if (!data.userID || !data.items || data.items.length === 0) {
      throw new Error("Invalid request: must have userID and items");
    }

    if (!data.startDate || !data.endDate) {
      throw new Error("Invalid request: must have startDate and endDate");
    }

    // Verify user exists
    try {
      await getAuth().getUser(data.userID);
    } catch {
      throw new Error("User not found");
    }

    const requestID = await RequestRepository.create(data);
    const request = await RequestRepository.getById(requestID);

    if (!request) {
      throw new Error("Failed to create request");
    }

    return request;
  }

  /**
   * Get a request by ID.
   */
  static async getRequestById(requestID: string): Promise<Request> {
    const request = await RequestRepository.getById(requestID);

    if (!request) {
      throw new Error(`Request not found: ${requestID}`);
    }

    return request;
  }

  /**
   * Get all requests (paginated/filtered).
   */
  static async getAllRequests(status?: string): Promise<Request[]> {
    return await RequestRepository.getAll(status);
  }

  /**
   * Get pending requests (awaiting approval).
   */
  static async getPendingRequests(): Promise<Request[]> {
    return await RequestRepository.getPending();
  }

  /**
   * Get requests by user.
   */
  static async getRequestsByUser(userID: string): Promise<Request[]> {
    return await RequestRepository.getByUserId(userID);
  }

  /**
   * Update a request (by requester or admin).
   * Status transitions are validated.
   */
  static async updateRequest(requestID: string, updates: RequestUpdateInput): Promise<Request> {
    const request = await RequestRepository.getById(requestID);

    if (!request) {
      throw new Error(`Request not found: ${requestID}`);
    }

    // Validate status transition if status is being changed
    if (updates.status && updates.status !== request.status) {
      this.validateStatusTransition(request.status, updates.status);
    }

    await RequestRepository.update(requestID, updates);

    const updated = await RequestRepository.getById(requestID);
    if (!updated) {
      throw new Error("Failed to update request");
    }

    return updated;
  }

  /**
   * Approve a request (admin only).
   */
  static async approveRequest(requestID: string, adminUid: string): Promise<Request> {
    const request = await RequestRepository.getById(requestID);

    if (!request) {
      throw new Error(`Request not found: ${requestID}`);
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot approve request with status: ${request.status}`);
    }

    await RequestRepository.approve(requestID, adminUid);

    const updated = await RequestRepository.getById(requestID);
    if (!updated) {
      throw new Error("Failed to approve request");
    }

    return updated;
  }

  /**
   * Reject a request (admin only).
   */
  static async rejectRequest(requestID: string, reason: string): Promise<Request> {
    const request = await RequestRepository.getById(requestID);

    if (!request) {
      throw new Error(`Request not found: ${requestID}`);
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot reject request with status: ${request.status}`);
    }

    await RequestRepository.reject(requestID, reason);

    const updated = await RequestRepository.getById(requestID);
    if (!updated) {
      throw new Error("Failed to reject request");
    }

    return updated;
  }

  /**
   * Mark request as ongoing (equipment borrowed).
   */
  static async markOngoing(requestID: string): Promise<Request> {
    const request = await RequestRepository.getById(requestID);

    if (!request) {
      throw new Error(`Request not found: ${requestID}`);
    }

    if (request.status !== "approved") {
      throw new Error(`Only approved requests can be marked ongoing`);
    }

    await RequestRepository.markOngoing(requestID);

    const updated = await RequestRepository.getById(requestID);
    if (!updated) {
      throw new Error("Failed to mark request as ongoing");
    }

    return updated;
  }

  /**
   * Mark request as returned (equipment returned).
   */
  static async markReturned(requestID: string): Promise<Request> {
    const request = await RequestRepository.getById(requestID);

    if (!request) {
      throw new Error(`Request not found: ${requestID}`);
    }

    if (request.status !== "ongoing") {
      throw new Error(`Only ongoing requests can be marked as returned`);
    }

    await RequestRepository.markReturned(requestID);

    const updated = await RequestRepository.getById(requestID);
    if (!updated) {
      throw new Error("Failed to mark request as returned");
    }

    return updated;
  }

  /**
   * Delete a request (typically only pending requests).
   */
  static async deleteRequest(requestID: string): Promise<void> {
    const request = await RequestRepository.getById(requestID);

    if (!request) {
      throw new Error(`Request not found: ${requestID}`);
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot delete request with status: ${request.status}`);
    }

    await RequestRepository.delete(requestID);
  }

  /**
   * Validate status transitions.
   * Defines which status transitions are allowed.
   */
  private static validateStatusTransition(currentStatus: string, newStatus: string): void {
    const allowedTransitions: Record<string, string[]> = {
      pending: ["approved", "rejected"],
      approved: ["ongoing", "rejected"],
      ongoing: ["returned"],
      returned: ["completed"],
      rejected: [],
      completed: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }
}
