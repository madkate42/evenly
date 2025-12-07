import { Receipt, ItemAssignment, PersonShare } from '../schemas';

export class Itemizer {
  private assignments: Map<string, Map<string, PersonShare[]>>;

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

    if (!receiptAssignments.has(itemId)) {
      receiptAssignments.set(itemId, []);
    }

    const itemShares = receiptAssignments.get(itemId)!;

    const totalShareForItem = this.calculateTotalShareForItem(receiptId, itemId) + share;
    if (totalShareForItem > 1.0001) {
      throw new Error(
        `Total share for item ${itemId} would exceed 1.0 (current: ${totalShareForItem.toFixed(4)})`
      );
    }

    itemShares.push({ personId, share });
  }

  getAssignments(receiptId: string): ItemAssignment[] {
    const receiptAssignments = this.assignments.get(receiptId);
    if (!receiptAssignments) {
      return [];
    }

    const result: ItemAssignment[] = [];
    for (const [itemId, assignments] of receiptAssignments.entries()) {
      result.push({ itemId, assignments });
    }

    return result;
  }

  validateAssignments(receipt: Receipt, assignments: ItemAssignment[]): boolean {
    const itemShares = new Map<string, number>();

    for (const assignment of assignments) {
      let totalShare = 0;
      for (const personShare of assignment.assignments) {
        totalShare += personShare.share;
      }
      itemShares.set(assignment.itemId, totalShare);
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

    const itemShares = receiptAssignments.get(itemId);
    if (!itemShares) {
      return 0;
    }

    let total = 0;
    for (const personShare of itemShares) {
      total += personShare.share;
    }

    return total;
  }
}
