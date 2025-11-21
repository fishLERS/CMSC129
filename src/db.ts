export interface Equipment {
  imsgeLink?: string;
  name: string;
  totalInventory: number;
  category?: string;
  isDisposable: boolean;
}

export interface EquipmentIssue {
  equipmentID: string;
  reporterID: string;
  description: string;
  issueStatus: string;
  reportedAt: Date;
  resolvedAt?: Date;
}