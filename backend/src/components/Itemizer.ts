import { Receipt, PersonAssignment, ItemAssignment } from '../schemas';

export class Itemizer {
  private assignments: Map<string, Map<string, ItemAssignment[]>>;

  constructor() {
    this.assignments = new Map();
  }

  assignItemToPerson(
    receiptId: string,
    itemId: string,
    personId: string,
    share: number
  ): void {
    if (share < 0 || share > 1) {
      throw new Error('Share must be between 0 and 1');
    }

    if (!this.assignments.has(receiptId)) {
      this.assignments.set(receiptId, new Map());
    }

    const receiptAssignments = this.assignments.get(receiptId)!;

    if (!receiptAssignments.has(personId)) {
      receiptAssignments.set(personId, []);
    }

    const personItems = receiptAssignments.get(personId)!;

    const totalShareForItem = this.calculateTotalShareForItem(receiptId, itemId) + share;
    if (totalShareForItem > 1.0001) {
      throw new Error(
        `Total share for item ${itemId} would exceed 1.0 (current: ${totalShareForItem.toFixed(4)})`
      );
    }

    personItems.push({ itemId, share });
  }

  getAssignments(receiptId: string): PersonAssignment[] {
    const receiptAssignments = this.assignments.get(receiptId);
    if (!receiptAssignments) {
      return [];
    }

    const result: PersonAssignment[] = [];
    for (const [personId, items] of receiptAssignments.entries()) {
      result.push({ personId, items });
    }

    return result;
  }

  validateAssignments(receipt: Receipt, assignments: PersonAssignment[]): boolean {
    const itemShares = new Map<string, number>();

    for (const assignment of assignments) {
      for (const itemAssignment of assignment.items) {
        const currentShare = itemShares.get(itemAssignment.itemId) || 0;
        itemShares.set(itemAssignment.itemId, currentShare + itemAssignment.share);
      }
    }

    for (const item of receipt.items) {
      const totalShare = itemShares.get(item.id) || 0;
      if (Math.abs(totalShare - 1.0) > 0.0001) {
        return false;
      }
    }

    return true;
  }

  private calculateTotalShareForItem(receiptId: string, itemId: string): number {
    const receiptAssignments = this.assignments.get(receiptId);
    if (!receiptAssignments) {
      return 0;
    }

    let total = 0;
    for (const personItems of receiptAssignments.values()) {
      for (const item of personItems) {
        if (item.itemId === itemId) {
          total += item.share;
        }
      }
    }

    return total;
  }
}
