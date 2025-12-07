import { Receipt, PersonAssignment } from '../schemas';

export class Itemizer {
  assignItemToPerson(
    _receiptId: string,
    _itemId: string,
    _personId: string,
    _share: number
  ): void {
    // TODO: Implement item assignment logic
    throw new Error('Not implemented');
  }

  getAssignments(_receiptId: string): PersonAssignment[] {
    // TODO: Return assignments for a receipt
    throw new Error('Not implemented');
  }

  validateAssignments(_receipt: Receipt, _assignments: PersonAssignment[]): boolean {
    // TODO: Validate that all items are fully assigned (shares sum to 1.0)
    throw new Error('Not implemented');
  }
}
