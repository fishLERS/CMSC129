export interface Equipment {
    equipmentID?: string;
    imageLink?: string;
    name: string;
    totalInventory: number;
    category?: string;
    isDisposable: boolean;
}

export interface AvailableEquipmentItem extends Equipment {
    available: number;
    reserved: number;
    isAvailable: boolean;
}

export interface EquipmentIssue {
    equipmentIssueID?: string;
    equipmentID: string;
    description: string;
    // reporterID?: string;
    // issueStatus: string;
    // reportedAt: Date;
    // resolvedAt?: Date;
}