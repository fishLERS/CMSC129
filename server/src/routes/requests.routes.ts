import { Router } from "express";
import { RequestController } from "../controllers/requests.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

/**
 * Request Routes.
 * Defines HTTP endpoints for equipment reservation operations.
 *
 * Public read endpoints: available with requireAuth
 * Create: requireAuth (any user)
 * Approve/Reject: requireAuth + requireAdmin
 * Admin endpoints: marked with requireAuth, requireAdmin (commented out for now)
 */
const router = Router();

// List and get endpoints (require auth)
router.get("/", requireAuth, RequestController.listRequests);
router.get("/pending", /* requireAuth, requireAdmin, */ RequestController.getPending);
router.get("/user/:uid", requireAuth, RequestController.getByUser);
router.get("/:id", requireAuth, RequestController.getRequest);

// Create endpoint (require auth)
router.post("/", requireAuth, RequestController.createRequest);

// Update endpoint (require auth)
router.patch("/:id", requireAuth, RequestController.updateRequest);

// Approval endpoints (require admin)
router.post("/:id/approve", /* requireAuth, requireAdmin, */ RequestController.approveRequest);
router.post("/:id/reject", /* requireAuth, requireAdmin, */ RequestController.rejectRequest);

// Status transition endpoints (require auth)
router.post("/:id/ongoing", /* requireAuth, */ RequestController.markOngoing);
router.post("/:id/return", /* requireAuth, */ RequestController.markReturned);

// Delete endpoint
router.delete("/:id", /* requireAuth, */ RequestController.deleteRequest);

export default router;
