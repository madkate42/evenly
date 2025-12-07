import { Parser } from '../Parser';

describe('Parser', () => {
  let parser: Parser;

  beforeEach(() => {
    parser = new Parser();
  });

  describe('parseOCR', () => {
    it('should parse a simple receipt with all fields', () => {
      const ocrData = `CHIPOTLE
123 MAIN ST
12/07/2025
BURRITO  12.50
GUACAMOLE  3.25
CHIPS  2.75
SODA  2.95
SUBTOTAL  21.45
TAX  1.93
TIP  4.00
TOTAL  27.38`;

      const receipt = parser.parseOCR(ocrData, 'user-123');

      expect(receipt.merchant).toBe('CHIPOTLE');
      expect(receipt.date.getFullYear()).toBe(2025);
      expect(receipt.date.getMonth()).toBe(11); // December (0-indexed)
      expect(receipt.date.getDate()).toBe(7);
      expect(receipt.items).toHaveLength(4);
      expect(receipt.items[0]).toMatchObject({
        name: 'BURRITO',
        price: 12.50,
        quantity: 1,
      });
      expect(receipt.subtotal).toBe(21.45);
      expect(receipt.tax).toBe(1.93);
      expect(receipt.tip).toBe(4.00);
      expect(receipt.total).toBe(27.38);
      expect(receipt.paidBy).toBe('user-123');
      expect(receipt.discounts).toBeUndefined();
    });

    it('should parse receipt without tax and tip', () => {
      const ocrData = `STARBUCKS
Coffee Shop
01/15/2025
LATTE  5.50
CROISSANT  3.75
TOTAL  9.25`;

      const receipt = parser.parseOCR(ocrData);

      expect(receipt.merchant).toBe('STARBUCKS');
      expect(receipt.items).toHaveLength(2);
      expect(receipt.subtotal).toBe(9.25); // calculated from items
      expect(receipt.tax).toBeUndefined();
      expect(receipt.tip).toBeUndefined();
      expect(receipt.total).toBe(9.25);
    });

    it('should handle receipt with prices including dollar sign', () => {
      const ocrData = `TARGET
Main Street
12/01/2025
PRODUCT ONE  15.99
PRODUCT TWO  8.50
SUBTOTAL  $24.49
TAX  $2.20
TOTAL  $26.69`;

      const receipt = parser.parseOCR(ocrData, 'p1');

      expect(receipt.items).toHaveLength(2);
      expect(receipt.items[0].price).toBe(15.99);
      expect(receipt.items[1].price).toBe(8.50);
      expect(receipt.subtotal).toBe(24.49);
      expect(receipt.tax).toBe(2.20);
      expect(receipt.total).toBe(26.69);
    });

    it('should calculate subtotal from items when not provided', () => {
      const ocrData = `CAFE
Coffee  4.00
Muffin  3.50
TAX  0.75
TOTAL  8.25`;

      const receipt = parser.parseOCR(ocrData);

      expect(receipt.items).toHaveLength(2);
      expect(receipt.subtotal).toBe(7.50); // 4.00 + 3.50
      expect(receipt.total).toBe(8.25);
    });

    it('should skip lines that look like totals when extracting items', () => {
      const ocrData = `STORE
12/01/2025
Product Name  10.00
SUBTOTAL  10.00
TAX  1.00
TOTAL  11.00`;

      const receipt = parser.parseOCR(ocrData);

      expect(receipt.items).toHaveLength(1);
      expect(receipt.items[0].name).toBe('Product Name');
    });

    it('should skip metadata lines when extracting items', () => {
      const ocrData = `STORE
12/01/2025
My Product  5.00
Another Item  3.00
TOTAL  8.00`;

      const receipt = parser.parseOCR(ocrData);

      expect(receipt.items).toHaveLength(2);
      expect(receipt.items[0].name).toBe('My Product');
      expect(receipt.items[1].name).toBe('Another Item');
    });

    it('should handle different date formats', () => {
      const ocrData1 = `STORE\n12/07/2025\nItem  5.00\nTOTAL  5.00`;
      const receipt1 = parser.parseOCR(ocrData1);
      expect(receipt1.date.getFullYear()).toBe(2025);

      const ocrData2 = `STORE\n2025/12/07\nItem  5.00\nTOTAL  5.00`;
      const receipt2 = parser.parseOCR(ocrData2);
      expect(receipt2.date.getFullYear()).toBe(2025);

      const ocrData3 = `STORE\n12-07-2025\nItem  5.00\nTOTAL  5.00`;
      const receipt3 = parser.parseOCR(ocrData3);
      expect(receipt3.date.getFullYear()).toBe(2025);
    });

    it('should use current date when no date found', () => {
      const ocrData = `STORE\nItem  5.00\nTOTAL  5.00`;
      const receipt = parser.parseOCR(ocrData);

      const now = new Date();
      expect(receipt.date.getFullYear()).toBe(now.getFullYear());
      expect(receipt.date.getMonth()).toBe(now.getMonth());
      expect(receipt.date.getDate()).toBe(now.getDate());
    });

    it('should skip likely non-merchant header lines', () => {
      const ocrData = `RECEIPT
#12345
CA
ACTUAL STORE NAME
Item  5.00
TOTAL  5.00`;

      const receipt = parser.parseOCR(ocrData);

      expect(receipt.merchant).toBe('ACTUAL STORE NAME');
    });

    it('should default merchant to "Unknown Merchant" if none found', () => {
      const ocrData = `#\n##\n123`;
      const receipt = parser.parseOCR(ocrData);

      expect(receipt.merchant).toBe('Unknown Merchant');
    });

    it('should round money values to 2 decimal places', () => {
      const ocrData = `STORE
12/01/2025
Widget One  10.33
Widget Two  5.67
TOTAL  16.00`;

      const receipt = parser.parseOCR(ocrData);

      expect(receipt.items[0].price).toBe(10.33);
      expect(receipt.items[1].price).toBe(5.67);
      expect(receipt.total).toBe(16.00);
    });

    it('should default paidBy to empty string when not provided', () => {
      const ocrData = `STORE\n12/01/2025\nMy Item  5.00\nTOTAL  5.00`;
      const receipt = parser.parseOCR(ocrData);

      expect(receipt.paidBy).toBe('');
    });

    it('should generate unique IDs for receipt and items', () => {
      const ocrData = `STORE\n12/01/2025\nMy Item  5.00\nTOTAL  5.00`;
      const receipt1 = parser.parseOCR(ocrData);
      const receipt2 = parser.parseOCR(ocrData);

      expect(receipt1.id).not.toBe(receipt2.id);
      expect(receipt1.items[0].id).not.toBe(receipt2.items[0].id);
    });

    it('should handle empty OCR data gracefully', () => {
      const ocrData = '';
      const receipt = parser.parseOCR(ocrData);

      expect(receipt.merchant).toBe('Unknown Merchant');
      expect(receipt.items).toHaveLength(0);
      expect(receipt.subtotal).toBe(0);
      expect(receipt.total).toBe(0);
    });
  });

  describe('parseManual', () => {
    it('should parse valid manual entry', () => {
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

      const receipt = parser.parseManual(manualData);

      expect(receipt.merchant).toBe('Starbucks');
      expect(receipt.date).toEqual(new Date('2025-12-07'));
      expect(receipt.items).toHaveLength(2);
      expect(receipt.items[0]).toMatchObject({
        name: 'Latte',
        price: 5.50,
        quantity: 2,
      });
      expect(receipt.subtotal).toBe(14.75); // 5.50*2 + 3.75
      expect(receipt.tax).toBe(1.28);
      expect(receipt.tip).toBe(2.50);
      expect(receipt.total).toBe(18.53); // 14.75 + 1.28 + 2.50
      expect(receipt.paidBy).toBe('user-456');
    });

    it('should throw error if merchant is missing', () => {
      const manualData = {
        items: [{ name: 'Item', price: 5.00, quantity: 1 }],
      };

      expect(() => parser.parseManual(manualData)).toThrow('Invalid manual data: merchant and items are required');
    });

    it('should throw error if items is missing', () => {
      const manualData = {
        merchant: 'Store',
      };

      expect(() => parser.parseManual(manualData)).toThrow('Invalid manual data: merchant and items are required');
    });

    it('should throw error if items is not an array', () => {
      const manualData = {
        merchant: 'Store',
        items: 'not an array',
      };

      expect(() => parser.parseManual(manualData)).toThrow('Invalid manual data: merchant and items are required');
    });

    it('should calculate subtotal from items when not provided', () => {
      const manualData = {
        merchant: 'Store',
        items: [
          { name: 'Item1', price: 10.00, quantity: 2 },
          { name: 'Item2', price: 5.50, quantity: 1 },
        ],
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.subtotal).toBe(25.50); // 10*2 + 5.50
    });

    it('should calculate total when not provided', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ name: 'Item', price: 10.00, quantity: 1 }],
        tax: 1.00,
        tip: 2.00,
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.total).toBe(13.00); // 10 + 1 + 2
    });

    it('should use provided subtotal over calculated', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ name: 'Item', price: 10.00, quantity: 1 }],
        subtotal: 9.50, // With discount
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.subtotal).toBe(9.50);
    });

    it('should use provided total over calculated', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ name: 'Item', price: 10.00, quantity: 1 }],
        total: 15.00,
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.total).toBe(15.00);
    });

    it('should default tax and tip to undefined when not provided', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ name: 'Item', price: 10.00, quantity: 1 }],
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.tax).toBeUndefined();
      expect(receipt.tip).toBeUndefined();
      expect(receipt.total).toBe(10.00); // Just subtotal
    });

    it('should use current date when date not provided', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ name: 'Item', price: 10.00, quantity: 1 }],
      };

      const receipt = parser.parseManual(manualData);

      const now = new Date();
      expect(receipt.date.getFullYear()).toBe(now.getFullYear());
      expect(receipt.date.getMonth()).toBe(now.getMonth());
      expect(receipt.date.getDate()).toBe(now.getDate());
    });

    it('should default paidBy to empty string when not provided', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ name: 'Item', price: 10.00, quantity: 1 }],
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.paidBy).toBe('');
    });

    it('should handle item without name', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ price: 10.00, quantity: 1 }],
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.items[0].name).toBe('Unknown Item');
    });

    it('should handle item without quantity', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ name: 'Item', price: 10.00 }],
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.items[0].quantity).toBe(1);
    });

    it('should handle item without price', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ name: 'Item', quantity: 2 }],
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.items[0].price).toBe(0);
    });

    it('should generate IDs for items that do not have them', () => {
      const manualData = {
        merchant: 'Store',
        items: [
          { name: 'Item1', price: 5.00, quantity: 1 },
          { name: 'Item2', price: 3.00, quantity: 1 },
        ],
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.items[0].id).toBeDefined();
      expect(receipt.items[1].id).toBeDefined();
      expect(receipt.items[0].id).not.toBe(receipt.items[1].id);
    });

    it('should preserve item IDs when provided', () => {
      const manualData = {
        merchant: 'Store',
        items: [
          { id: 'custom-id-1', name: 'Item', price: 5.00, quantity: 1 },
        ],
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.items[0].id).toBe('custom-id-1');
    });

    it('should preserve receipt ID when provided', () => {
      const manualData = {
        id: 'custom-receipt-id',
        merchant: 'Store',
        items: [{ name: 'Item', price: 5.00, quantity: 1 }],
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.id).toBe('custom-receipt-id');
    });

    it('should round all money values to 2 decimal places', () => {
      const manualData = {
        merchant: 'Store',
        items: [{ name: 'Item', price: 10.33333, quantity: 1 }],
        tax: 1.11111,
        tip: 2.22222,
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.subtotal).toBe(10.33);
      expect(receipt.tax).toBe(1.11);
      expect(receipt.tip).toBe(2.22);
      expect(receipt.total).toBe(13.67); // 10.33333 + 1.11111 + 2.22222 = 13.66666 rounds to 13.67
    });
  });

  describe('integration scenarios', () => {
    it('should handle OCR data from a restaurant receipt', () => {
      const ocrData = `OLIVE GARDEN
1234 Restaurant Blvd
Orlando, FL
Server: John
Table: 15
Date: 03/15/2025

FETTUCCINE ALFREDO  16.99
BREADSTICKS  0.00
SALAD  8.99
ICED TEA  2.99
TIRAMISU  7.99

SUBTOTAL  36.96
TAX  3.33
TIP  7.39
TOTAL  47.68

Thank you!`;

      const receipt = parser.parseOCR(ocrData, 'p1');

      expect(receipt.merchant).toBe('OLIVE GARDEN');
      expect(receipt.items.length).toBeGreaterThan(0);
      expect(receipt.subtotal).toBe(36.96);
      expect(receipt.tax).toBe(3.33);
      expect(receipt.tip).toBe(7.39);
      expect(receipt.total).toBe(47.68);
    });

    it('should handle manual entry matching pizza place example', () => {
      const manualData = {
        merchant: 'Pizza Place',
        date: '2025-12-07',
        items: [
          { id: 'i1', name: 'Pepperoni Pizza', price: 20, quantity: 1 },
          { id: 'i2', name: 'Caesar Salad', price: 12, quantity: 1 },
          { id: 'i3', name: 'Drinks', price: 15, quantity: 1 },
        ],
        subtotal: 47,
        tax: 4.23,
        tip: 9.4,
        total: 60.63,
        paidBy: 'p2',
      };

      const receipt = parser.parseManual(manualData);

      expect(receipt.items).toHaveLength(3);
      expect(receipt.subtotal).toBe(47);
      expect(receipt.tax).toBe(4.23);
      expect(receipt.tip).toBe(9.4);
      expect(receipt.total).toBe(60.63);
      expect(receipt.paidBy).toBe('p2');
    });
  });
});
