import { Router } from "express";
import { EquipmentController } from "../controllers/equipment.controller.js";
// import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// ============ CATEGORY ROUTES ============
// Place these above /:id routes to prevent "categories" being treated as an ID
router.get("/categories", EquipmentController.listCategories);
router.post("/categories", EquipmentController.createCategory);
router.delete("/categories/:id", EquipmentController.deleteCategory);

// ============ EQUIPMENT READ ROUTES ============
// These utilize the Firestore -> MongoDB failover logic
router.get("/", EquipmentController.listEquipment);
router.get("/purged", EquipmentController.getPurgedEquipment);
router.get("/:id", EquipmentController.getEquipment);

// ============ EQUIPMENT WRITE ROUTES ============
// These target Firestore to trigger the backup synchronization
router.post("/", EquipmentController.createEquipment);
router.patch("/:id", EquipmentController.updateEquipment);
router.delete("/:id", EquipmentController.deleteEquipment);

// ============ ARCHIVE & RESTORE ROUTES ============
router.put("/:id/archive", EquipmentController.archiveEquipment);
router.put("/:id/restore", EquipmentController.restoreEquipment);
router.put("/:id/restore-purged", EquipmentController.restorePurgedEquipment);

export default router;