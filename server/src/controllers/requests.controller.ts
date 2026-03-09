import { Request, Response } from "express";
import { RequestService } from "../services/requests.service.js";

/**
 * Request Controller.
 * Handles HTTP requests for equipment reservation operations.
 *
 * Purpose: HTTP layer for request endpoints.
 */
export class RequestController {
  /**
   * POST /api/requests
   * Create a new request.
   * Body: { userID, items, startDate, endDate, purpose? }
   */
  static async createRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = await RequestService.createRequest(req.body);
      res.status(201).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/requests
   * Get all requests (optionally filtered by status).
   * Query: ?status=pending|approved|ongoing|returned|completed
   */
  static async listRequests(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const requests = await RequestService.getAllRequests(status as string | undefined);
      res.status(200).json({ success: true, data: requests });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/requests/pending
   * Get pending requests (awaiting admin approval).
   */
  static async getPending(req: Request, res: Response): Promise<void> {
    try {
      const requests = await RequestService.getPendingRequests();
      res.status(200).json({ success: true, data: requests });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/requests/user/:uid
   * Get all requests by a specific user.
   */
  static async getByUser(req: Request, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      const requests = await RequestService.getRequestsByUser(uid);
      res.status(200).json({ success: true, data: requests });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/requests/:id
   * Get a single request by ID.
   */
  static async getRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = await RequestService.getRequestById(req.params.id);
      res.status(200).json({ success: true, data: request });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/requests/:id
   * Update a request.
   * Body: partial request object
   */
  static async updateRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = await RequestService.updateRequest(req.params.id, req.body);
      res.status(200).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/requests/:id/approve
   * Approve a request (admin only).
   */
  static async approveRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Not authenticated" });
        return;
      }

      const request = await RequestService.approveRequest(req.params.id, req.user.uid);
      res.status(200).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/requests/:id/reject
   * Reject a request (admin only).
   * Body: { reason }
   */
  static async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Not authenticated" });
        return;
      }

      const { reason } = req.body;
      if (!reason) {
        res.status(400).json({ success: false, error: "Rejection reason required" });
        return;
      }

      const request = await RequestService.rejectRequest(req.params.id, reason, req.user.uid);
      res.status(200).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/requests/:id/override-approve
   * Super admin override from rejected -> approved.
   * Body: { reason? }
   */
  static async overrideApproveRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Not authenticated" });
        return;
      }

      const { reason } = req.body;
      const request = await RequestService.overrideApproveRequest(req.params.id, req.user.uid, reason);
      res.status(200).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/requests/:id/override-reject
   * Super admin override from approved -> rejected.
   * Body: { reason }
   */
  static async overrideRejectRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Not authenticated" });
        return;
      }

      const { reason } = req.body;
      if (!reason) {
        res.status(400).json({ success: false, error: "Override reason required" });
        return;
      }

      const request = await RequestService.overrideRejectRequest(req.params.id, req.user.uid, reason);
      res.status(200).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/requests/:id/ongoing
   * Mark request as ongoing (equipment borrowed).
   */
  static async markOngoing(req: Request, res: Response): Promise<void> {
    try {
      const request = await RequestService.markOngoing(req.params.id);
      res.status(200).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/requests/:id/return
   * Mark request as returned (equipment returned).
   */
  static async markReturned(req: Request, res: Response): Promise<void> {
    try {
      const request = await RequestService.markReturned(req.params.id);
      res.status(200).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/requests/:id
   * Delete a request (pending only).
   */
  static async deleteRequest(req: Request, res: Response): Promise<void> {
    try {
      await RequestService.deleteRequest(req.params.id);
      res.status(200).json({ success: true, message: "Request deleted" });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
