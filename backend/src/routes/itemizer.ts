import { Router } from 'express';
import { Itemizer } from '../components/Itemizer';

const router = Router();
const itemizer = new Itemizer();

// POST /api/itemizer/assign - Assign item to person
router.post('/assign', (req, res) => {
  try {
    const { receiptId, itemId, personId, share } = req.body;
    itemizer.assignItemToPerson(receiptId, itemId, personId, share);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign item' });
  }
});

// GET /api/itemizer/assignments/:receiptId - Get assignments for a receipt
router.get('/assignments/:receiptId', (req, res) => {
  try {
    const assignments = itemizer.getAssignments(req.params.receiptId);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get assignments' });
  }
});

export default router;
