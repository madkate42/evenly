import { Router } from 'express';
import { Parser } from '../components/Parser';

const router = Router();
const parser = new Parser();

// POST /api/parser/ocr - Parse receipt from OCR data
router.post('/ocr', (req, res) => {
  try {
    const receipt = parser.parseOCR(req.body.ocrData);
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse OCR data' });
  }
});

// POST /api/parser/manual - Parse receipt from manual entry
router.post('/manual', (req, res) => {
  try {
    const receipt = parser.parseManual(req.body);
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse manual data' });
  }
});

export default router;
