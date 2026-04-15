import { Request, Response } from "express";
import { EquipmentService } from "../services/equipment.service.js";

/**
 * Equipment Controller.
 * Handles HTTP layer for equipment and categories.
 * * Strategy:
 * - READS: Utilize failover logic via Service (Firestore -> MongoDB).
 * - WRITES: Target Primary database (Firestore) via Service to ensure sync listeners trigger.
 */
export class EquipmentController {

  // ============ EQUIPMENT ENDPOINTS ============

  /**
   * POST /api/equipment
   * Create new equipment.
   */
  static async createEquipment(req: Request, res: Response): Promise<void> {
    try {
      const equipment = await EquipmentService.createEquipment(req.body);
      res.status(201).json({ success: true, data: equipment });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/equipment
   * Retrieve all equipment.
   * RESILIENCE: Auto-fallback to MongoDB if Firestore is unreachable.
   */
  static async listEquipment(req: Request, res: Response): Promise<void> {
    try {
      const includeArchived = req.query.includeArchived === "true";
      const equipment = includeArchived
        ? await EquipmentService.getAllEquipment()
        : await EquipmentService.getActiveEquipment();

      res.status(200).json({ success: true, data: equipment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Database service temporarily unavailable." });
    }
  }

  /**
   * GET /api/equipment/:id
   * Retrieve a single equipment by ID.
   */
  static async getEquipment(req: Request, res: Response): Promise<void> {
    try {
      const equipment = await EquipmentService.getEquipmentById(req.params.id);
      res.status(200).json({ success: true, data: equipment });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/equipment/:id
   * Update equipment details.
   */
  static async updateEquipment(req: Request, res: Response): Promise<void> {
    try {
      const equipment = await EquipmentService.updateEquipment(req.params.id, req.body);
      res.status(200).json({ success: true, data: equipment });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/equipment/:id/archive
   * Soft delete logic.
   */
  static async archiveEquipment(req: Request, res: Response): Promise<void> {
    try {
      await EquipmentService.archiveEquipment(req.params.id);
      res.status(200).json({ success: true, message: "Equipment archived successfully" });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/equipment/:id/restore
   * Restore from soft-deleted state.
   */
  static async restoreEquipment(req: Request, res: Response): Promise<void> {
    try {
      const equipment = await EquipmentService.restoreEquipment(req.params.id);
      res.status(200).json({ success: true, data: equipment });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/equipment/:id
   * Permanent removal (purged).
   */
  static async deleteEquipment(req: Request, res: Response): Promise<void> {
    try {
      await EquipmentService.deleteEquipment(req.params.id);
      res.status(200).json({ success: true, message: "Equipment permanently deleted" });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/equipment/purged
   * Audit trail for deleted items.
   */
  static async getPurgedEquipment(req: Request, res: Response): Promise<void> {
    try {
      const purged = await EquipmentService.getPurgedEquipment();
      res.status(200).json({ success: true, data: purged });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/equipment/:id/restore-purged
   */
  static async restorePurgedEquipment(req: Request, res: Response): Promise<void> {
    try {
      const equipment = await EquipmentService.restorePurgedEquipment(req.params.id);
      res.status(200).json({ success: true, data: equipment });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ============ CATEGORY ENDPOINTS ============

  /**
   * POST /api/categories
   */
  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = await EquipmentService.createCategory(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/categories
   * RESILIENCE: Failover to MongoDB backup enabled.
   */
  static async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await EquipmentService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/categories/:id
   */
  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      await EquipmentService.deleteCategory(req.params.id);
      res.status(200).json({ success: true, message: "Category deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}