import { Receipt, ReceiptItem } from '../schemas';
import { randomUUID } from 'crypto';

export class Parser {
  parseOCR(ocrData: string, paidBy: string = ''): Receipt {
    const lines = this.cleanLines(ocrData);

    const merchant = this.extractMerchant(lines);
    const date = this.extractDate(lines);
    const items = this.extractItems(lines);
    const totals = this.extractTotals(lines);

    // Calculate subtotal from items if not found
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotal = totals.subtotal ?? itemsTotal;

    return {
      id: randomUUID(),
      merchant,
      date,
      items,
      subtotal: this.roundMoney(subtotal),
      discounts: totals.discount ? this.roundMoney(totals.discount) : undefined,
      tax: totals.tax ? this.roundMoney(totals.tax) : undefined,
      tip: totals.tip ? this.roundMoney(totals.tip) : undefined,
      total: this.roundMoney(totals.total),
      paidBy,
    };
  }

  parseManual(manualData: unknown): Receipt {
    // Validate and parse manual entry
    const data = manualData as any;

    if (!data.merchant || !data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid manual data: merchant and items are required');
    }

    const items: ReceiptItem[] = data.items.map((item: any) => ({
      id: item.id || randomUUID(),
      name: item.name || 'Unknown Item',
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity) || 1,
    }));

    const subtotal = data.subtotal ?? items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discounts = data.discounts ? parseFloat(data.discounts) : undefined;
    const tax = data.tax ? parseFloat(data.tax) : undefined;
    const tip = data.tip ? parseFloat(data.tip) : undefined;
    const total = data.total ?? (subtotal - (discounts ?? 0) + (tax ?? 0) + (tip ?? 0));

    return {
      id: data.id || randomUUID(),
      merchant: data.merchant,
      date: data.date ? new Date(data.date) : new Date(),
      items,
      subtotal: this.roundMoney(subtotal),
      discounts: discounts !== undefined ? this.roundMoney(discounts) : undefined,
      tax: tax !== undefined ? this.roundMoney(tax) : undefined,
      tip: tip !== undefined ? this.roundMoney(tip) : undefined,
      total: this.roundMoney(total),
      paidBy: data.paidBy || '',
    };
  }

  private cleanLines(text: string): string[] {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  private extractMerchant(lines: string[]): string {
    // First non-empty line is usually the merchant
    // Filter out common header junk (receipt numbers, etc)
    for (const line of lines) {
      if (line.length > 2 && !this.isLikelyNotMerchant(line)) {
        return line;
      }
    }
    return 'Unknown Merchant';
  }

  private isLikelyNotMerchant(line: string): boolean {
    const notMerchantPatterns = [
      /^receipt/i,
      /^#?\d+$/,  // Just numbers
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,  // Date
      /^[A-Z]{2,3}\s*$/,  // State abbreviations
    ];
    return notMerchantPatterns.some(pattern => pattern.test(line));
  }

  private extractDate(lines: string[]): Date {
    // Common date patterns
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // MM/DD/YYYY or MM-DD-YYYY
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,    // YYYY/MM/DD
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          const parsed = new Date(line);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
      }
    }

    return new Date(); // Default to now
  }

  private extractItems(lines: string[]): ReceiptItem[] {
    const items: ReceiptItem[] = [];

    // Look for lines with prices (format: "ITEM NAME  $X.XX" or "ITEM NAME  X.XX")
    const itemPattern = /^(.+?)\s+\$?(\d+\.\d{2})\s*$/;

    for (const line of lines) {
      // Skip lines that are likely totals/tax/tip
      if (this.isLikelyTotal(line)) continue;

      const match = line.match(itemPattern);
      if (match) {
        const name = match[1].trim();
        const price = parseFloat(match[2]);

        // Skip if name is too short or looks like metadata
        if (name.length < 2 || this.isLikelyMetadata(name)) continue;

        items.push({
          id: randomUUID(),
          name,
          price,
          quantity: 1, // OCR rarely captures quantity reliably
        });
      }
    }

    return items;
  }

  private isLikelyTotal(line: string): boolean {
    const totalKeywords = /\b(subtotal|total|tax|tip|discount|balance|amount|payment|cash|credit|card)\b/i;
    return totalKeywords.test(line);
  }

  private isLikelyMetadata(text: string): boolean {
    const metadataPatterns = [
      /^(qty|sku|item|code|#)/i,
      /^\d+$/,
    ];
    return metadataPatterns.some(pattern => pattern.test(text));
  }

  private extractTotals(lines: string[]): {
    subtotal: number | null;
    discount: number;
    tax: number;
    tip: number;
    total: number;
  } {
    let subtotal: number | null = null;
    let discount = 0;
    let tax = 0;
    let tip = 0;
    let total = 0;

    // Patterns to match totals
    const subtotalPattern = /subtotal.*?\$?(\d+\.\d{2})/i;
    const discountPattern = /discount.*?\$?(\d+\.\d{2})/i;
    const taxPattern = /tax.*?\$?(\d+\.\d{2})/i;
    const tipPattern = /tip.*?\$?(\d+\.\d{2})/i;
    const totalPattern = /(?:^|\b)total.*?\$?(\d+\.\d{2})/i;

    for (const line of lines) {
      let match;

      if ((match = line.match(subtotalPattern))) {
        subtotal = parseFloat(match[1]);
      } else if ((match = line.match(discountPattern))) {
        discount = parseFloat(match[1]);
      } else if ((match = line.match(taxPattern))) {
        tax = parseFloat(match[1]);
      } else if ((match = line.match(tipPattern))) {
        tip = parseFloat(match[1]);
      } else if ((match = line.match(totalPattern))) {
        total = parseFloat(match[1]);
      }
    }

    return { subtotal, discount, tax, tip, total };
  }

  private roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
