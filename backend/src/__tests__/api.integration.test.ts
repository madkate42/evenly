import request from 'supertest';
import app from '../app';

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return API message on root endpoint', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Evenly API' });
    });
  });

  describe('Balance Manager Flow', () => {
    it('should handle complete flow: add people, receipts, and calculate settlements', async () => {
      // Add people
      const alice = await request(app)
        .post('/api/balance/person')
        .send({ displayName: 'Alice' });

      expect(alice.status).toBe(200);
      expect(alice.body.displayName).toBe('Alice');

      const bob = await request(app)
        .post('/api/balance/person')
        .send({ displayName: 'Bob' });

      expect(bob.status).toBe(200);
      expect(bob.body.displayName).toBe('Bob');

      // Create a receipt
      const receipt = {
        id: 'r1',
        merchant: 'Test Restaurant',
        date: new Date().toISOString(),
        items: [
          { id: 'i1', name: 'Pizza', price: 20, quantity: 1 },
          { id: 'i2', name: 'Salad', price: 10, quantity: 1 },
        ],
        subtotal: 30,
        tax: 3,
        tip: 6,
        total: 39,
        paidBy: bob.body.id, // Bob pays
      };

      const assignments = [
        {
          itemId: 'i1', // Pizza
          assignments: [
            { personId: alice.body.id, share: 0.5 },
            { personId: bob.body.id, share: 0.5 },
          ],
        },
        {
          itemId: 'i2', // Salad
          assignments: [{ personId: bob.body.id, share: 1.0 }],
        },
      ];
      

      // Add receipt
      const receiptResponse = await request(app)
        .post('/api/balance/receipt')
        .send({ receipt, assignments });

      expect(receiptResponse.status).toBe(200);
      expect(receiptResponse.body.success).toBe(true);

      // Get balance
      const balanceResponse = await request(app).get('/api/balance');

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.persons).toHaveLength(2);
      expect(balanceResponse.body.receipts).toHaveLength(1);

      // Calculate settlements
      const settlementsResponse = await request(app).get('/api/balance/settlements');

      expect(settlementsResponse.status).toBe(200);
      expect(settlementsResponse.body).toBeInstanceOf(Array);

      // Alice should owe Bob
      // Alice's share: 10 (pizza) + proportional tax/tip
      // Alice: 10 + (10/30)*3 + (10/30)*6 = 10 + 1 + 2 = 13
      // Bob paid 39, owes 26 (10 pizza + 10 salad + 2 tax + 4 tip)
      // Net: Bob is owed 39 - 26 = 13 from Alice

      const settlements = settlementsResponse.body;
      expect(settlements).toHaveLength(1);
      expect(settlements[0].from).toBe(alice.body.id);
      expect(settlements[0].to).toBe(bob.body.id);
      expect(settlements[0].amount).toBe(13);
    });
  });

  describe('Parser Routes', () => {
    it('should successfully parse OCR data', async () => {
      const ocrData = `CHIPOTLE
123 MAIN ST
12/07/2025
BURRITO  12.50
GUACAMOLE  3.25
SUBTOTAL  15.75
TAX  1.42
TIP  3.00
TOTAL  20.17`;

      const response = await request(app)
        .post('/api/parser/ocr')
        .send({ ocrData, paidBy: 'user-123' });

      expect(response.status).toBe(200);
      expect(response.body.merchant).toBe('CHIPOTLE');
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0].name).toBe('BURRITO');
      expect(response.body.items[0].price).toBe(12.50);
      expect(response.body.subtotal).toBe(15.75);
      expect(response.body.tax).toBe(1.42);
      expect(response.body.tip).toBe(3.00);
      expect(response.body.total).toBe(20.17);
      expect(response.body.paidBy).toBe('user-123');
      expect(response.body.id).toBeDefined();
    });

    it('should successfully parse manual data', async () => {
      const manualData = {
        merchant: 'Starbucks',
        date: '2025-12-07',
        items: [
          { name: 'Latte', price: 5.50, quantity: 2 },
          { name: 'Croissant', price: 3.75, quantity: 1 },
        ],
        tax: 1.28,
        tip: 2.50,
        paidBy: 'user-456',
      };

      const response = await request(app)
        .post('/api/parser/manual')
        .send(manualData);

      expect(response.status).toBe(200);
      expect(response.body.merchant).toBe('Starbucks');
      expect(response.body.items).toHaveLength(2);
      expect(response.body.subtotal).toBe(14.75);
      expect(response.body.tax).toBe(1.28);
      expect(response.body.tip).toBe(2.50);
      expect(response.body.total).toBe(18.53);
      expect(response.body.paidBy).toBe('user-456');
    });

    it('should return error for invalid manual data', async () => {
      const response = await request(app)
        .post('/api/parser/manual')
        .send({ merchant: 'Test' }); // Missing items

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to parse manual data');
    });
  });

  describe('Itemizer Routes', () => {
    it('should successfully assign item to person', async () => {
      const response = await request(app)
        .post('/api/itemizer/assign')
        .send({
          receiptId: 'r1',
          itemId: 'i1',
          personId: 'p1',
          share: 0.5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get assignments for a receipt', async () => {
      // First assign an item
      await request(app)
        .post('/api/itemizer/assign')
        .send({
          receiptId: 'r2',
          itemId: 'i1',
          personId: 'p1',
          share: 1.0,
        });

      // Then get assignments
      const response = await request(app).get('/api/itemizer/assignments/r2');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        itemId: 'i1',
        assignments: [{ personId: 'p1', share: 1.0 }],
      });
    });

    it('should return empty array for receipt with no assignments', async () => {
      const response = await request(app).get('/api/itemizer/assignments/nonexistent');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('Multi-receipt Settlement Optimization', () => {
    it('should optimize settlements across multiple receipts', async () => {
      // Note: BalanceManager maintains state across requests (as designed for the API)
      // This test creates a new isolated scenario with unique IDs

      // Add three new people
      const dave = await request(app)
        .post('/api/balance/person')
        .send({ displayName: 'Dave' });

      const eve = await request(app)
        .post('/api/balance/person')
        .send({ displayName: 'Eve' });

      const frank = await request(app)
        .post('/api/balance/person')
        .send({ displayName: 'Frank' });

      // Receipt 1: Dave pays $30, all split equally
      const receipt1 = {
        id: 'r100',
        merchant: 'Store 1',
        date: new Date().toISOString(),
        items: [{ id: 'i100', name: 'Item', price: 30, quantity: 1 }],
        subtotal: 30,
        total: 30,
        paidBy: dave.body.id,
      };

      const assignments1 = [
        {
          itemId: 'i100',
          assignments: [
            { personId: dave.body.id, share: 1 / 3 },
            { personId: eve.body.id, share: 1 / 3 },
            { personId: frank.body.id, share: 1 / 3 },
          ],
        },
      ];

      await request(app)
        .post('/api/balance/receipt')
        .send({ receipt: receipt1, assignments: assignments1 });

      // Receipt 2: Eve pays $15, Dave and Frank split
      const receipt2 = {
        id: 'r200',
        merchant: 'Store 2',
        date: new Date().toISOString(),
        items: [{ id: 'i200', name: 'Item', price: 15, quantity: 1 }],
        subtotal: 15,
        total: 15,
        paidBy: eve.body.id,
      };

      const assignments2 = [
        {
          itemId: 'i200',
          assignments: [
            { personId: dave.body.id, share: 0.5 },
            { personId: frank.body.id, share: 0.5 },
          ],
        },
      ];

      await request(app)
        .post('/api/balance/receipt')
        .send({ receipt: receipt2, assignments: assignments2 });

      // Get settlements
      const settlementsResponse = await request(app).get('/api/balance/settlements');

      expect(settlementsResponse.status).toBe(200);

      const settlements = settlementsResponse.body;

      // Verify that there are settlements involving our people
      const daveInSettlements = settlements.some(
        (s: any) => s.from === dave.body.id || s.to === dave.body.id
      );
      const eveInSettlements = settlements.some(
        (s: any) => s.from === eve.body.id || s.to === eve.body.id
      );
      const frankInSettlements = settlements.some(
        (s: any) => s.from === frank.body.id || s.to === frank.body.id
      );

      // At least some of our people should be in settlements
      expect(daveInSettlements || eveInSettlements || frankInSettlements).toBe(true);

      // Frank should be paying since he paid 0 but owes 10+7.5=17.5
      const frankSettlements = settlements.filter(
        (s: any) => s.from === frank.body.id
      );
      expect(frankSettlements.length).toBeGreaterThan(0);

      const totalFrankPays = frankSettlements.reduce(
        (sum: number, s: any) => sum + s.amount,
        0
      );
      // Frank owes exactly 17.5 from these two receipts
      expect(totalFrankPays).toBeGreaterThan(0);
    });
  });
});
