import { Balance, Person, Receipt, PersonAssignment, Settlement } from '../schemas';

export class BalanceManager {
  private balance: Balance;

  constructor() {
    this.balance = {
      persons: [],
      receipts: [],
      assignments: new Map(),
      settlements: [],
    };
  }

  addPerson(_displayName: string): Person {
    // TODO: Create and add a new person
    throw new Error('Not implemented');
  }

  addReceipt(_receipt: Receipt, _assignments: PersonAssignment[]): void {
    // TODO: Add receipt and its assignments to the balance
    throw new Error('Not implemented');
  }

  calculateSettlements(): Settlement[] {
    // TODO: Calculate proportional tax/tip per person
    // TODO: Determine who owes whom and how much
    throw new Error('Not implemented');
  }

  getBalance(): Balance {
    return this.balance;
  }
}
