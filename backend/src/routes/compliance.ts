import { Router } from 'express';
import { checkTemperature } from '../services/compliance.js';
import { submitCompliance, getCompliance } from '../services/chain.js';

const router = Router();

router.post('/compliance/verify', async (req, res, next) => {
  try {
    const { batchId } = req.body;
    if (!batchId) return res.status(400).json({ message: 'batchId required' });
    
    const passed = await checkTemperature(batchId);
    const receipt = await submitCompliance(
      batchId,
      "temperature < 10°C",
      passed
    );
    
    return res.json({ 
      batchId, 
      passed, 
      txHash: receipt.hash 
    });
  } catch (error) {
    next(error);
  }
});

router.get('/compliance/:batchId', async (req, res, next) => {
  try {
    const checks = await getCompliance(req.params.batchId);
    return res.json({ checks });
  } catch (error) {
    next(error);
  }
});

export default router;