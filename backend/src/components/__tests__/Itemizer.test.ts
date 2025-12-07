import { Itemizer } from '../Itemizer';
import { Receipt } from '../../schemas';

describe('Itemizer', () => {
  let itemizer: Itemizer;

  beforeEach(() => {
    itemizer = new Itemizer();
  });

  describe('assignItemToPerson', () => {
    it('should assign an item to a person', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.5);

      const assignments = itemizer.getAssignments('r1');
      expect(assignments).toHaveLength(1);
      expect(assignments[0]).toEqual({
        itemId: 'i1',
        assignments: [{ personId: 'p1', share: 0.5 }],
      });
    });

    it('should allow multiple people to share an item', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.5);
      itemizer.assignItemToPerson('r1', 'i1', 'p2', 0.5);

      const assignments = itemizer.getAssignments('r1');
      expect(assignments).toHaveLength(1);
      expect(assignments[0]).toEqual({
        itemId: 'i1',
        assignments: [
          { personId: 'p1', share: 0.5 },
          { personId: 'p2', share: 0.5 },
        ],
      });
    });

    it('should allow one person to have multiple items', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.5);
      itemizer.assignItemToPerson('r1', 'i2', 'p1', 1.0);

      const assignments = itemizer.getAssignments('r1');
      expect(assignments).toHaveLength(2);
    });

    it('should throw error if share is less than 0', () => {
      expect(() => {
        itemizer.assignItemToPerson('r1', 'i1', 'p1', -0.1);
      }).toThrow('Share must be between 0 and 1');
    });

    it('should throw error if share is greater than 1', () => {
      expect(() => {
        itemizer.assignItemToPerson('r1', 'i1', 'p1', 1.5);
      }).toThrow('Share must be between 0 and 1');
    });

    it('should throw error if total share for an item exceeds 1.0', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.6);

      expect(() => {
        itemizer.assignItemToPerson('r1', 'i1', 'p2', 0.5);
      }).toThrow('Total share for item i1 would exceed 1.0');
    });

    it('should allow total share to equal exactly 1.0', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.3);
      itemizer.assignItemToPerson('r1', 'i1', 'p2', 0.3);
      itemizer.assignItemToPerson('r1', 'i1', 'p3', 0.4);

      const assignments = itemizer.getAssignments('r1');
      expect(assignments).toHaveLength(1);
      expect(assignments[0].assignments).toHaveLength(3);
    });

    it('should handle assignments across multiple receipts', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.5);
      itemizer.assignItemToPerson('r2', 'i2', 'p1', 1.0);

      const r1Assignments = itemizer.getAssignments('r1');
      const r2Assignments = itemizer.getAssignments('r2');

      expect(r1Assignments).toHaveLength(1);
      expect(r2Assignments).toHaveLength(1);
    });
  });

  describe('getAssignments', () => {
    it('should return empty array for receipt with no assignments', () => {
      const assignments = itemizer.getAssignments('nonexistent');
      expect(assignments).toEqual([]);
    });

    it('should return all assignments for a receipt', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.5);
      itemizer.assignItemToPerson('r1', 'i1', 'p2', 0.5);
      itemizer.assignItemToPerson('r1', 'i2', 'p3', 1.0);

      const assignments = itemizer.getAssignments('r1');
      expect(assignments).toHaveLength(2);

      const i1Assignment = assignments.find((a) => a.itemId === 'i1');
      const i2Assignment = assignments.find((a) => a.itemId === 'i2');

      expect(i1Assignment?.assignments).toHaveLength(2);
      expect(i2Assignment?.assignments).toHaveLength(1);
    });
  });

  describe('validateAssignments', () => {
    const mockReceipt: Receipt = {
      id: 'r1',
      merchant: 'Test Store',
      date: new Date(),
      items: [
        { id: 'i1', name: 'Pizza', price: 20, quantity: 1 },
        { id: 'i2', name: 'Salad', price: 12, quantity: 1 },
      ],
      subtotal: 32,
      total: 41.28,
      paidBy: 'p1',
      discounts: 0,
      tax: 2.88,
      tip: 6.4,
    };

    it('should return true when all items are fully assigned', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.5);
      itemizer.assignItemToPerson('r1', 'i1', 'p2', 0.5);
      itemizer.assignItemToPerson('r1', 'i2', 'p1', 1.0);

      const assignments = itemizer.getAssignments('r1');
      const isValid = itemizer.validateAssignments(mockReceipt, assignments);

      expect(isValid).toBe(true);
    });

    it('should return false when an item is not assigned', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 1.0);
      // i2 is not assigned

      const assignments = itemizer.getAssignments('r1');
      const isValid = itemizer.validateAssignments(mockReceipt, assignments);

      expect(isValid).toBe(false);
    });

    it('should return false when an item is partially assigned', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.5);
      itemizer.assignItemToPerson('r1', 'i1', 'p2', 0.3); // Only 0.8 total
      itemizer.assignItemToPerson('r1', 'i2', 'p1', 1.0);

      const assignments = itemizer.getAssignments('r1');
      const isValid = itemizer.validateAssignments(mockReceipt, assignments);

      expect(isValid).toBe(false);
    });

    it('should handle floating point precision', () => {
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.33);
      itemizer.assignItemToPerson('r1', 'i1', 'p2', 0.33);
      itemizer.assignItemToPerson('r1', 'i1', 'p3', 0.34);
      itemizer.assignItemToPerson('r1', 'i2', 'p1', 1.0);

      const assignments = itemizer.getAssignments('r1');
      const isValid = itemizer.validateAssignments(mockReceipt, assignments);

      expect(isValid).toBe(true);
    });

    it('should return true for empty receipt with no assignments', () => {
      const emptyReceipt: Receipt = {
        ...mockReceipt,
        items: [],
      };

      const isValid = itemizer.validateAssignments(emptyReceipt, []);
      expect(isValid).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle the pizza place example from docs', () => {
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
        paidBy: 'p2',
        discounts: 0,
        tax: 4.23,
        tip: 9.4,
      };

      // Alice and Bob split pizza
      itemizer.assignItemToPerson('r1', 'i1', 'p1', 0.5);
      itemizer.assignItemToPerson('r1', 'i1', 'p2', 0.5);

      // Carol gets salad
      itemizer.assignItemToPerson('r1', 'i2', 'p3', 1.0);

      // All three split drinks
      itemizer.assignItemToPerson('r1', 'i3', 'p1', 0.33);
      itemizer.assignItemToPerson('r1', 'i3', 'p2', 0.33);
      itemizer.assignItemToPerson('r1', 'i3', 'p3', 0.34);

      const assignments = itemizer.getAssignments('r1');
      const isValid = itemizer.validateAssignments(receipt, assignments);

      expect(isValid).toBe(true);
      expect(assignments).toHaveLength(3);

      // Verify pizza (i1) assignments
      const pizzaAssignment = assignments.find((a) => a.itemId === 'i1');
      expect(pizzaAssignment?.assignments).toEqual([
        { personId: 'p1', share: 0.5 },
        { personId: 'p2', share: 0.5 },
      ]);

      // Verify salad (i2) assignment
      const saladAssignment = assignments.find((a) => a.itemId === 'i2');
      expect(saladAssignment?.assignments).toEqual([{ personId: 'p3', share: 1.0 }]);

      // Verify drinks (i3) assignments
      const drinksAssignment = assignments.find((a) => a.itemId === 'i3');
      expect(drinksAssignment?.assignments).toEqual([
        { personId: 'p1', share: 0.33 },
        { personId: 'p2', share: 0.33 },
        { personId: 'p3', share: 0.34 },
      ]);
    });
  });
});
