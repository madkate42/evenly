import { BalanceManager } from '../BalanceManager';
import { Receipt, ItemAssignment } from '../../schemas';

describe('BalanceManager', () => {
  let balanceManager: BalanceManager;

  beforeEach(() => {
    balanceManager = new BalanceManager();
  });

  describe('addPerson', () => {
    it('should add a person with auto-incremented ID', () => {
      const person1 = balanceManager.addPerson('Alice');
      const person2 = balanceManager.addPerson('Bob');

      expect(person1).toEqual({ id: 'p1', displayName: 'Alice' });
      expect(person2).toEqual({ id: 'p2', displayName: 'Bob' });
    });

    it('should add person to balance', () => {
      balanceManager.addPerson('Alice');
      const balance = balanceManager.getBalance();

      expect(balance.persons).toHaveLength(1);
      expect(balance.persons[0].displayName).toBe('Alice');
    });
  });

  describe('addReceipt', () => {
    it('should add receipt and assignments to balance', () => {
      const receipt: Receipt = {
        id: 'r1',
        merchant: 'Test Store',
        date: new Date(),
        items: [{ id: 'i1', name: 'Item', price: 10, quantity: 1 }],
        subtotal: 10,
        total: 13,
        paidBy: 'p1',
        discounts: 0,
        tax: 1,
        tip: 2,
      };

      const assignments: ItemAssignment[] = [
        { itemId: 'i1', assignments: [{ personId: 'p1', share: 1.0 }] },
      ];

      balanceManager.addReceipt(receipt, assignments);
      const balance = balanceManager.getBalance();

      expect(balance.receipts).toHaveLength(1);
      expect(balance.receipts[0].id).toBe('r1');
      expect(balance.assignments.get('r1')).toEqual(assignments);
    });
  });

  describe('calculateSettlements', () => {
    it('should calculate no settlements when person pays for own receipt', () => {
      balanceManager.addPerson('Alice');

      const receipt: Receipt = {
        id: 'r1',
        merchant: 'Test Store',
        date: new Date(),
        items: [{ id: 'i1', name: 'Item', price: 10, quantity: 1 }],
        subtotal: 10,
        total: 13,
        paidBy: 'p1',
        discounts: 0,
        tax: 1,
        tip: 2,
      };

      const assignments: ItemAssignment[] = [
        { itemId: 'i1', assignments: [{ personId: 'p1', share: 1.0 }] },
      ];

      balanceManager.addReceipt(receipt, assignments);
      const settlements = balanceManager.calculateSettlements();

      expect(settlements).toHaveLength(0);
    });

    it('should calculate simple settlement when one person pays for another', () => {
      balanceManager.addPerson('Alice');
      balanceManager.addPerson('Bob');

      const receipt: Receipt = {
        id: 'r1',
        merchant: 'Test Store',
        date: new Date(),
        items: [{ id: 'i1', name: 'Item', price: 10, quantity: 1 }],
        subtotal: 10,
        total: 13,
        paidBy: 'p1', // Alice pays
        discounts: 0,
        tax: 1,
        tip: 2,
      };

      const assignments: ItemAssignment[] = [
        { itemId: 'i1', assignments: [{ personId: 'p2', share: 1.0 }] }, // Bob gets the item
      ];

      balanceManager.addReceipt(receipt, assignments);
      const settlements = balanceManager.calculateSettlements();

      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        from: 'p2',
        to: 'p1',
        amount: 13,
      });
    });

    it('should apply proportional tax and tip', () => {
      balanceManager.addPerson('Alice');
      balanceManager.addPerson('Bob');

      const receipt: Receipt = {
        id: 'r1',
        merchant: 'Test Store',
        date: new Date(),
        items: [
          { id: 'i1', name: 'Item 1', price: 10, quantity: 1 },
          { id: 'i2', name: 'Item 2', price: 20, quantity: 1 },
        ],
        subtotal: 30,
        total: 39,
        paidBy: 'p1', // Alice pays
        discounts: 0,
        tax: 3,
        tip: 6,
      };

      const assignments: ItemAssignment[] = [
        { itemId: 'i1', assignments: [{ personId: 'p1', share: 1.0 }] }, // Alice: 10
        { itemId: 'i2', assignments: [{ personId: 'p2', share: 1.0 }] }, // Bob: 20
      ];

      balanceManager.addReceipt(receipt, assignments);
      const settlements = balanceManager.calculateSettlements();

      // Alice owes: 10 + (10/30)*3 + (10/30)*6 = 10 + 1 + 2 = 13
      // Bob owes: 20 + (20/30)*3 + (20/30)*6 = 20 + 2 + 4 = 26
      // Alice paid 39, owes 13, so net: +26
      // Bob owes 26, paid 0, so net: -26
      // Bob pays Alice 26

      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        from: 'p2',
        to: 'p1',
        amount: 26,
      });
    });

    it('should apply proportional discounts', () => {
      balanceManager.addPerson('Alice');
      balanceManager.addPerson('Bob');

      const receipt: Receipt = {
        id: 'r1',
        merchant: 'Test Store',
        date: new Date(),
        items: [
          { id: 'i1', name: 'Item 1', price: 20, quantity: 1 },
          { id: 'i2', name: 'Item 2', price: 20, quantity: 1 },
        ],
        subtotal: 40,
        total: 33,
        paidBy: 'p1',
        discounts: 10, // $10 discount
        tax: 3,
        tip: 0,
      };

      const assignments: ItemAssignment[] = [
        { itemId: 'i1', assignments: [{ personId: 'p1', share: 1.0 }] },
        { itemId: 'i2', assignments: [{ personId: 'p2', share: 1.0 }] },
      ];

      balanceManager.addReceipt(receipt, assignments);
      const settlements = balanceManager.calculateSettlements();

      // Alice: (20 - 5) + 1.5 = 16.5
      // Bob: (20 - 5) + 1.5 = 16.5
      // Alice paid 33, owes 16.5, net: +16.5
      // Bob owes 16.5, net: -16.5

      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        from: 'p2',
        to: 'p1',
        amount: 16.5,
      });
    });

    it('should handle split items correctly', () => {
      balanceManager.addPerson('Alice');
      balanceManager.addPerson('Bob');

      const receipt: Receipt = {
        id: 'r1',
        merchant: 'Test Store',
        date: new Date(),
        items: [{ id: 'i1', name: 'Pizza', price: 20, quantity: 1 }],
        subtotal: 20,
        total: 26,
        paidBy: 'p1',
        discounts: 0,
        tax: 2,
        tip: 4,
      };

      const assignments: ItemAssignment[] = [
        {
          itemId: 'i1',
          assignments: [
            { personId: 'p1', share: 0.5 },
            { personId: 'p2', share: 0.5 },
          ],
        },
      ];

      balanceManager.addReceipt(receipt, assignments);
      const settlements = balanceManager.calculateSettlements();

      // Each person: 10 + 1 + 2 = 13
      // Alice paid 26, owes 13, net: +13
      // Bob owes 13, net: -13

      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        from: 'p2',
        to: 'p1',
        amount: 13,
      });
    });

    it('should optimize settlements across multiple receipts', () => {
      balanceManager.addPerson('Alice');
      balanceManager.addPerson('Bob');

      // Receipt 1: Alice pays, Bob owes $10
      const receipt1: Receipt = {
        id: 'r1',
        merchant: 'Store 1',
        date: new Date(),
        items: [{ id: 'i1', name: 'Item', price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        paidBy: 'p1',
        discounts: 0,
        tax: 0,
        tip: 0,
      };

      const assignments1: ItemAssignment[] = [
        { itemId: 'i1', assignments: [{ personId: 'p2', share: 1.0 }] },
      ];

      // Receipt 2: Bob pays, Alice owes $5
      const receipt2: Receipt = {
        id: 'r2',
        merchant: 'Store 2',
        date: new Date(),
        items: [{ id: 'i2', name: 'Item', price: 5, quantity: 1 }],
        subtotal: 5,
        total: 5,
        paidBy: 'p2',
        discounts: 0,
        tax: 0,
        tip: 0,
      };

      const assignments2: ItemAssignment[] = [
        { itemId: 'i2', assignments: [{ personId: 'p1', share: 1.0 }] },
      ];

      balanceManager.addReceipt(receipt1, assignments1);
      balanceManager.addReceipt(receipt2, assignments2);
      const settlements = balanceManager.calculateSettlements();

      // Net: Bob owes Alice $10, Alice owes Bob $5
      // Optimized: Bob pays Alice $5

      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        from: 'p2',
        to: 'p1',
        amount: 5,
      });
    });

    it('should handle the pizza place example from docs', () => {
      const alice = balanceManager.addPerson('Alice');
      const bob = balanceManager.addPerson('Bob');
      const carol = balanceManager.addPerson('Carol');

      const receipt: Receipt = {
        id: 'r1',
        merchant: 'Pizza Place',
        date: new Date(),
        items: [
          { id: 'i1', name: 'Pepperoni Pizza', price: 20, quantity: 1 },
          { id: 'i2', name: 'Caesar Salad', price: 12, quantity: 1 },
          { id: 'i3', name: 'Drinks', price: 15, quantity: 1 },
        ],
        subtotal: 47,
        total: 60.63,
        paidBy: bob.id, // Bob pays
        discounts: 0,
        tax: 4.23,
        tip: 9.4,
      };

      const assignments: ItemAssignment[] = [
        {
          itemId: 'i1',
          assignments: [
            { personId: alice.id, share: 0.5 },
            { personId: bob.id, share: 0.5 },
          ],
        },
        {
          itemId: 'i2',
          assignments: [{ personId: carol.id, share: 1.0 }],
        },
        {
          itemId: 'i3',
          assignments: [
            { personId: alice.id, share: 0.33 },
            { personId: bob.id, share: 0.33 },
            { personId: carol.id, share: 0.34 },
          ],
        },
      ];

      balanceManager.addReceipt(receipt, assignments);
      const settlements = balanceManager.calculateSettlements();

      // Alice: (10 + 4.95) * 1.29 ≈ 19.29
      // Bob: (10 + 4.95) * 1.29 ≈ 19.29
      // Carol: (12 + 5.1) * 1.29 ≈ 22.06
      // Bob paid 60.63, owes 19.29, net: +41.34
      // Alice owes 19.29, net: -19.29
      // Carol owes 22.06, net: -22.06

      expect(settlements).toHaveLength(2);

      // Should have Alice and Carol both paying Bob
      const aliceSettlement = settlements.find((s) => s.from === alice.id);
      const carolSettlement = settlements.find((s) => s.from === carol.id);

      expect(aliceSettlement).toBeDefined();
      expect(aliceSettlement?.to).toBe(bob.id);
      expect(aliceSettlement?.amount).toBeCloseTo(19.29, 1);

      expect(carolSettlement).toBeDefined();
      expect(carolSettlement?.to).toBe(bob.id);
      expect(carolSettlement?.amount).toBeCloseTo(22.05, 1);
    });

    it('should handle three-way optimization', () => {
      const alice = balanceManager.addPerson('Alice');
      const bob = balanceManager.addPerson('Bob');
      const carol = balanceManager.addPerson('Carol');

      // R1: Alice pays $30, all split equally ($10 each)
      const receipt1: Receipt = {
        id: 'r1',
        merchant: 'Store 1',
        date: new Date(),
        items: [{ id: 'i1', name: 'Item', price: 30, quantity: 1 }],
        subtotal: 30,
        total: 30,
        paidBy: alice.id,
        discounts: 0,
        tax: 0,
        tip: 0,
      };

      const assignments1: ItemAssignment[] = [
        {
          itemId: 'i1',
          assignments: [
            { personId: alice.id, share: 1 / 3 },
            { personId: bob.id, share: 1 / 3 },
            { personId: carol.id, share: 1 / 3 },
          ],
        },
      ];

      // R2: Bob pays $15, Alice and Carol split ($7.50 each)
      const receipt2: Receipt = {
        id: 'r2',
        merchant: 'Store 2',
        date: new Date(),
        items: [{ id: 'i2', name: 'Item', price: 15, quantity: 1 }],
        subtotal: 15,
        total: 15,
        paidBy: bob.id,
        discounts: 0,
        tax: 0,
        tip: 0,
      };

      const assignments2: ItemAssignment[] = [
        {
          itemId: 'i2',
          assignments: [
            { personId: alice.id, share: 0.5 },
            { personId: carol.id, share: 0.5 },
          ],
        },
      ];

      balanceManager.addReceipt(receipt1, assignments1);
      balanceManager.addReceipt(receipt2, assignments2);
      const settlements = balanceManager.calculateSettlements();

      // Net balances:
      // Alice: paid 30, owes 10+7.5=17.5, net: +12.5
      // Bob: paid 15, owes 10, net: +5
      // Carol: paid 0, owes 10+7.5=17.5, net: -17.5

      // Optimized: Carol pays 17.5 total, split between Alice and Bob
      expect(settlements.length).toBeGreaterThan(0);

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBeCloseTo(17.5, 1);
    });
  });

  describe('getBalance', () => {
    it('should return the complete balance state', () => {
      balanceManager.addPerson('Alice');
      const balance = balanceManager.getBalance();

      expect(balance).toHaveProperty('persons');
      expect(balance).toHaveProperty('receipts');
      expect(balance).toHaveProperty('assignments');
      expect(balance).toHaveProperty('settlements');
    });
  });
});
