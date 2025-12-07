import { Receipt } from '../schemas';

export class Parser {
  parseOCR(_ocrData: string): Receipt {
    // TODO: Implement OCR parsing logic
    throw new Error('Not implemented');
  }

  parseManual(_manualData: unknown): Receipt {
    // TODO: Implement manual entry parsing logic
    throw new Error('Not implemented');
  }
}
