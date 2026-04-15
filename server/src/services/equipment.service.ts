import { Equipment, EquipmentUpdateInput, EquipmentResponse } from "../models/equipment.js";
import { EquipmentRepository } from "../repositories/equipment.repo.js";
import { Category, CategoryResponse } from "../models/category.js";
import { CategoryRepository } from "../repositories/category.repo.js";
import { getCollection, getDocument } from "../services/db.service.js";

/**
 * Equipment Service.
 * Refactored for Hybrid Database Architecture (Firestore Primary, MongoDB Backup).
 * * - Reads: Use failover-safe helpers (getDocument/getCollection).
 * - Writes: Use Repositories (Firestore) to trigger mirroring listeners.
 */
export class EquipmentService {

  // ============ EQUIPMENT OPERATIONS ============

  /**
   * Create new equipment.
   * Target: Primary (Firestore). Sync to Mongo happens via listeners.
   */
  static async createEquipment(data: Omit<Equipment, "equipmentID">): Promise<EquipmentResponse> {
    this.validateEquipmentInput(data);

    // Create always hits primary (Firestore)
    const equipmentID = await EquipmentRepository.create(data);

    // Fetch using failover-safe method to return created object
    return await this.getEquipmentById(equipmentID);
  }

  /**
   * Get all active equipment.
   * RESILIENCE: Reads from MongoDB if Firestore is down.
   */
  static async getActiveEquipment(): Promise<EquipmentResponse[]> {
    const all = await getCollection('equipment');
    return all
      .filter((e) => !e.isDeleted)
      .map((e) => this.mapToEquipmentResponse(e));
  }

  /**
   * Get all equipment including archived.
   */
  static async getAllEquipment(): Promise<EquipmentResponse[]> {
    const all = await getCollection('equipment');
    return all.map((e) => this.mapToEquipmentResponse(e));
  }

  /**
   * Get single equipment by ID.
   * RESILIENCE: Reads from MongoDB if Firestore is down.
   */
  static async getEquipmentById(equipmentID: string): Promise<EquipmentResponse> {
    const equipment = await getDocument('equipment', equipmentID);

    if (!equipment) {
      throw new Error(`Equipment not found: ${equipmentID}`);
    }

    return this.mapToEquipmentResponse(equipment);
  }

  /**
   * Update equipment.
   * Target: Primary (Firestore).
   */
  static async updateEquipment(
    equipmentID: string,
    data: Partial<EquipmentUpdateInput>
  ): Promise<EquipmentResponse> {
    // Check existence via failover-safe method
    await this.getEquipmentById(equipmentID);

    this.validateEquipmentUpdate(data);

    await EquipmentRepository.update(equipmentID, data);

    // Return the updated state
    return await this.getEquipmentById(equipmentID);
  }

  /**
   * Soft delete (archive).
   */
  static async archiveEquipment(equipmentID: string): Promise<void> {
    await this.getEquipmentById(equipmentID);
    await EquipmentRepository.softDelete(equipmentID);
  }

  /**
   * Restore archived equipment.
   */
  static async restoreEquipment(equipmentID: string): Promise<EquipmentResponse> {
    await this.getEquipmentById(equipmentID);
    await EquipmentRepository.restore(equipmentID);
    return await this.getEquipmentById(equipmentID);
  }

  /**
   * Hard delete (purge).
   */
  static async deleteEquipment(equipmentID: string): Promise<void> {
    await this.getEquipmentById(equipmentID);
    await EquipmentRepository.delete(equipmentID);
  }

  /**
   * Get all purged equipment records.
   */
  static async getPurgedEquipment(): Promise<EquipmentResponse[]> {
    const purged = await getCollection('purged_equipment');
    return purged.map(e => this.mapToEquipmentResponse(e));
  }

  /**
   * Restore equipment from purged state.
   */
  static async restorePurgedEquipment(equipmentID: string): Promise<EquipmentResponse> {
    await EquipmentRepository.restorePurged(equipmentID);
    return await this.getEquipmentById(equipmentID);
  }

  // ============ CATEGORY OPERATIONS ============

  /**
   * Create new category.
   */
  static async createCategory(data: Omit<Category, "categoryID">): Promise<CategoryResponse> {
    if (!data.name) throw new Error("Category name is required");

    const id = await CategoryRepository.create(data);

    // Retrieve via failover-safe getDocument
    const category = await getDocument('categories', id);
    return this.mapToCategoryResponse({ ...data, id, ...category });
  }

  /**
   * Get all categories.
   * RESILIENCE: Reads from MongoDB if Firestore is down.
   */
  static async getAllCategories(): Promise<CategoryResponse[]> {
    const categories = await getCollection('categories');
    return categories.map(c => this.mapToCategoryResponse(c));
  }

  /**
   * Delete category.
   */
  static async deleteCategory(id: string): Promise<void> {
    await CategoryRepository.delete(id);
  }

  // ============ PRIVATE HELPERS & VALIDATION ============

  /**
   * Maps database objects to consistent response types.
   * Handles ID differences between Firestore (id) and MongoDB (docId).
   */
  private static mapToEquipmentResponse(data: any): EquipmentResponse {
    return {
      ...data,
      equipmentID: data.id || data.docId || data.equipmentID,
    } as EquipmentResponse;
  }

  private static mapToCategoryResponse(data: any): CategoryResponse {
    return {
      ...data,
      categoryID: data.id || data.docId || data.categoryID,
    } as CategoryResponse;
  }

  private static validateEquipmentInput(data: any): void {
    if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
      throw new Error("Invalid input: name is required and must be a non-empty string");
    }
    if (typeof data.totalInventory !== "number" || data.totalInventory < 0) {
      throw new Error("Invalid input: totalInventory must be a non-negative number");
    }
    if (typeof data.isDisposable !== "boolean") {
      throw new Error("Invalid input: isDisposable must be a boolean");
    }
    if (!data.categoryID) {
      throw new Error("Invalid input: categoryID is required");
    }
  }

  private static validateEquipmentUpdate(data: any): void {
    if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length === 0)) {
      throw new Error("Invalid input: name must be a non-empty string");
    }
    if (data.totalInventory !== undefined && (typeof data.totalInventory !== "number" || data.totalInventory < 0)) {
      throw new Error("Invalid input: totalInventory must be a non-negative number");
    }
    if (data.isDisposable !== undefined && typeof data.isDisposable !== "boolean") {
      throw new Error("Invalid input: isDisposable must be a boolean");
    }
  }
}