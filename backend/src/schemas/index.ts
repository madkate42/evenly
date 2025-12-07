export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Receipt {
  id: string;
  merchant: string;
  date: Date;
  items: ReceiptItem[];
  subtotal: number;
  total: number;
  paidBy: string; // personId of who paid for this receipt
  discounts?: number;
  tax?: number;
  tip?: number;
}

export interface PersonShare {
  personId: string;
  share: number; // 0.0 to 1.0
}

export interface ItemAssignment {
  itemId: string;
  assignments: PersonShare[]; // List of people who have shares of this item
}

export interface Person {
  id: string;
  displayName: string; // "Person A" or custom name
}

export interface Settlement {
  from: string; // personId
  to: string; // personId
  amount: number;
}

export interface Balance {
  persons: Person[];
  receipts: Receipt[];
  assignments: Map<string, ItemAssignment[]>; // receiptId -> ItemAssignment[]
  settlements: Settlement[];
}
