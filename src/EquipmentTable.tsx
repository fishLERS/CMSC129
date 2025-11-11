import { Button } from "@/components/ui/button"
import EditEquipmentDialog from "@/EditEquipmentDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EquipmentItem } from "./type"

interface EquipmentTableProps {
  equipmentList: EquipmentItem[]
  onEdit: (id: string, info: Partial<Omit<EquipmentItem, "equipmentID">>) => void
  onDelete: (id: string) => void
}

export default function EquipmentTable({ equipmentList, onEdit, onDelete }: EquipmentTableProps) {
console.log("onEdit received:", onEdit)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Serial</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {equipmentList.map((item) => (
          <TableRow key={item.equipmentID}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell>{item.status}</TableCell>
            <TableCell>{item.serial}</TableCell>
            <TableCell>{item.notes}</TableCell>
            <TableCell className="flex gap-2">
              <EditEquipmentDialog item={item} onEdit={onEdit} />
              <Button variant="destructive" onClick={() => onDelete(item.equipmentID)}>
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
