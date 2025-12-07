import { Router } from 'express';
import { BalanceManager } from '../components/BalanceManager';

const router = Router();
const balanceManager = new BalanceManager();

// POST /api/balance/person - Add a new person
router.post('/person', (req, res) => {
  try {
    const person = balanceManager.addPerson(req.body.displayName);
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add person' });
  }
});

// POST /api/balance/receipt - Add a receipt with assignments
router.post('/receipt', (req, res) => {
  try {
    const { receipt, assignments } = req.body;
    balanceManager.addReceipt(receipt, assignments);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add receipt' });
  }
});

// GET /api/balance - Get current balance
router.get('/', (_req, res) => {
  try {
    const balance = balanceManager.getBalance();
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// GET /api/balance/settlements - Calculate and get settlements
router.get('/settlements', (_req, res) => {
  try {
    const settlements = balanceManager.calculateSettlements();
    res.json(settlements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate settlements' });
  }
});

export default router;
