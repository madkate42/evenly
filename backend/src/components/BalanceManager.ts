import { Balance, Person, Receipt, PersonAssignment, Settlement } from '../schemas';

export class BalanceManager {
  private balance: Balance;
  private personIdCounter: number;

  constructor() {
    this.balance = {
      persons: [],
      receipts: [],
      assignments: new Map(),
      settlements: [],
    };
    this.personIdCounter = 1;
  }

  addPerson(displayName: string): Person {
    const person: Person = {
      id: `p${this.personIdCounter++}`,
      displayName,
    };
    this.balance.persons.push(person);
    return person;
  }

  addReceipt(receipt: Receipt, assignments: PersonAssignment[]): void {
    this.balance.receipts.push(receipt);
    this.balance.assignments.set(receipt.id, assignments);
  }

  calculateSettlements(): Settlement[] {
    const netBalances = new Map<string, number>();

    // Initialize all persons with 0 balance
    for (const person of this.balance.persons) {
      netBalances.set(person.id, 0);
    }

    // Process each receipt
    for (const receipt of this.balance.receipts) {
      const assignments = this.balance.assignments.get(receipt.id) || [];

      // Calculate each person's share of the receipt
      for (const assignment of assignments) {
        const personSubtotal = this.calculatePersonSubtotal(receipt, assignment);
        const adjustedSubtotal = personSubtotal - this.calculateProportionalAmount(
          personSubtotal,
          receipt.subtotal,
          receipt.discounts
        );
        const personTax = this.calculateProportionalAmount(
          personSubtotal,
          receipt.subtotal,
          receipt.tax
        );
        const personTip = this.calculateProportionalAmount(
          personSubtotal,
          receipt.subtotal,
          receipt.tip
        );

        const personTotal = adjustedSubtotal + personTax + personTip;

        // Person owes this amount
        const currentBalance = netBalances.get(assignment.personId) || 0;
        netBalances.set(assignment.personId, currentBalance - personTotal);
      }

      // Person who paid gets credited
      const paidByBalance = netBalances.get(receipt.paidBy) || 0;
      netBalances.set(receipt.paidBy, paidByBalance + receipt.total);
    }

    // Generate optimized settlements
    return this.optimizeSettlements(netBalances);
  }

  getBalance(): Balance {
    return this.balance;
  }

  private calculatePersonSubtotal(receipt: Receipt, assignment: PersonAssignment): number {
    let subtotal = 0;

    for (const itemAssignment of assignment.items) {
      const item = receipt.items.find(i => i.id === itemAssignment.itemId);
      if (item) {
        subtotal += item.price * item.quantity * itemAssignment.share;
      }
    }

    return subtotal;
  }

  private calculateProportionalAmount(
    personSubtotal: number,
    receiptSubtotal: number,
    amount: number
  ): number {
    if (receiptSubtotal === 0) return 0;
    return (personSubtotal / receiptSubtotal) * amount;
  }

  private optimizeSettlements(netBalances: Map<string, number>): Settlement[] {
    const settlements: Settlement[] = [];

    // Separate into debtors (negative balance, owe money) and creditors (positive balance, are owed)
    const debtors: Array<{ personId: string; amount: number }> = [];
    const creditors: Array<{ personId: string; amount: number }> = [];

    for (const [personId, balance] of netBalances.entries()) {
      if (balance < -0.01) {
        debtors.push({ personId, amount: -balance });
      } else if (balance > 0.01) {
        creditors.push({ personId, amount: balance });
      }
    }

    // Sort by amount (largest first) for greedy algorithm
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    // Greedy matching: pair largest debtor with largest creditor
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const settlementAmount = Math.min(debtor.amount, creditor.amount);

      settlements.push({
        from: debtor.personId,
        to: creditor.personId,
        amount: Math.round(settlementAmount * 100) / 100, // Round to 2 decimal places
      });

      debtor.amount -= settlementAmount;
      creditor.amount -= settlementAmount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    this.balance.settlements = settlements;
    return settlements;
  }
}
