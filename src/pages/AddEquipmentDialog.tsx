import { useState } from "react";
import { addEquipment } from "@/lib/equipment.query";

export function AddEquipmentDialog() {
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await addEquipment({
      name: formData.get("name") as string,
      quantity: Number(formData.get("quantity")),
      category: formData.get("category") as string,
      location: formData.get("location") as string,
      status: "available",
    });

    e.currentTarget.reset();
    setOpen(false); // close modal after save
  }

  return (
    <>
      {/* Trigger button */}
      <button
        className="btn btn-outline"
        onClick={() => setOpen(true)}
      >
        Add Equipment
      </button>

      {/* DaisyUI modal */}
      {open && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Add New Equipment</h3>
            <p className="py-2 text-sm text-gray-500">
              Fill out the details below and click save.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label htmlFor="name" className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  id="name"
                  name="name"
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control">
                <label htmlFor="quantity" className="label">
                  <span className="label-text">Quantity</span>
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control">
                <label htmlFor="category" className="label">
                  <span className="label-text">Category</span>
                </label>
                <input
                  id="category"
                  name="category"
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label htmlFor="location" className="label">
                  <span className="label-text">Location</span>
                </label>
                <input
                  id="location"
                  name="location"
                  className="input input-bordered"
                />
              </div>

              {/* modal actions */}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </>
  );
}
