import React, { useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { Category } from "../../db";

interface CategoryDialogProps {
    categories: Category[];
}

export default function CategoryDialog({ categories }: CategoryDialogProps) {
    const [newCategory, setNewCategory] = useState("");

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
        try {
            await addDoc(collection(db, "categories"), {
                name: newCategory.trim(),
                createdAt: new Date().toISOString()
            });
            setNewCategory("");
        } catch (error) {
            console.error("Error adding category:", error);
        }
    };

    const handleDeleteCategory = async (id: string | undefined) => {
        if (!id) return;

        if (window.confirm("Are you sure?")) {
            await deleteDoc(doc(db, "categories", id));
        }
    };

    return (
        <>
            {/* The Button to open the Modal */}
            <button
                className="btn btn-outline btn-secondary gap-2"
                onClick={() => (window as any).category_modal.showModal()}
            >
                <Tag className="w-4 h-4" />
                Manage Categories
            </button>

            {/* The Modal */}
            <dialog id="category_modal" className="modal">
                <div className="modal-box bg-base-100">
                    <h3 className="font-bold text-lg mb-4">Inventory Categories</h3>

                    {/* Add New Category Input */}
                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="New category name..."
                            className="input input-bordered flex-1"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={handleAddCategory}>
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>

                    {/* List of Existing Categories */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {categories.map((cat) => (
                            <div key={cat.categoryID} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                                <span className="font-medium">{cat.name}</span>
                                <button
                                    className="btn btn-ghost btn-xs text-error"
                                    onClick={() => handleDeleteCategory(cat.categoryID)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <p className="text-center text-sm text-base-content/50 py-4">No categories created yet.</p>
                        )}
                    </div>

                    <div className="modal-action">
                        <form method="dialog">
                            <button className="btn">Close</button>
                        </form>
                    </div>
                </div>
            </dialog>
        </>
    );
}