import { Balance, Person, Receipt, ItemAssignment, Settlement } from '../schemas';

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

  addReceipt(receipt: Receipt, assignments: ItemAssignment[]): void {
    // Check if receipt already exists
    const existingIndex = this.balance.receipts.findIndex(r => r.id === receipt.id);

    if (existingIndex >= 0) {
      // Update existing receipt
      this.balance.receipts[existingIndex] = receipt;
    } else {
      // Add new receipt
      this.balance.receipts.push(receipt);
    }

    this.balance.assignments.set(receipt.id, assignments);
  }

  deleteReceipt(receiptId: string) {
    this.balance.receipts =
      this.balance.receipts.filter(r => r.id !== receiptId);
  
    this.balance.assignments.delete(receiptId);
  }

  updateReceipt(receiptId: string, data: Partial<Receipt>): Receipt {
    const index = this.balance.receipts.findIndex(r => r.id === receiptId);

    if (index === -1) {
      throw new Error('Receipt not found');
    }

    this.balance.receipts[index] = {
      ...this.balance.receipts[index],
      ...data,
      id: receiptId, // enforce correct ID
    };

    return this.balance.receipts[index];
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
      const personSubtotals = this.calculatePersonSubtotals(receipt, assignments);

      for (const [personId, personSubtotal] of personSubtotals.entries()) {
        const adjustedSubtotal = personSubtotal - this.calculateProportionalAmount(
          personSubtotal,
          receipt.subtotal,
          receipt.discounts ?? 0
        );
        const personTax = this.calculateProportionalAmount(
          personSubtotal,
          receipt.subtotal,
          receipt.tax ?? 0
        );
        const personTip = this.calculateProportionalAmount(
          personSubtotal,
          receipt.subtotal,
          receipt.tip ?? 0
        );

        const personTotal = adjustedSubtotal + personTax + personTip;

        // Person owes this amount
        const currentBalance = netBalances.get(personId) || 0;
        netBalances.set(personId, currentBalance - personTotal);
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

  private calculatePersonSubtotals(
    receipt: Receipt,
    assignments: ItemAssignment[]
  ): Map<string, number> {
    const personSubtotals = new Map<string, number>();

    for (const itemAssignment of assignments) {
      const item = receipt.items.find(i => i.id === itemAssignment.itemId);
      if (!item) continue;

      const itemCost = item.price * item.quantity;

      for (const personShare of itemAssignment.assignments) {
        const personCost = itemCost * personShare.share;
        const currentSubtotal = personSubtotals.get(personShare.personId) || 0;
        personSubtotals.set(personShare.personId, currentSubtotal + personCost);
      }
    }

    return personSubtotals;
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
