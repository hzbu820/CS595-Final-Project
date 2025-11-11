import { Router } from 'express';
import multer from 'multer';
import {
  persistEventFile,
  readStoredEvent,
  verifyBuffer,
} from '../services/storageService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.post('/events/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'file is required' });
    }
    const { batchId = '' } = req.body;
    if (!batchId) {
      return res.status(400).json({ message: 'batchId is required' });
    }

    const stored = await persistEventFile(req.file.buffer, batchId);
    return res.json({
      batchId,
      cid: stored.cid,
      sha256: stored.sha256,
      size: stored.size,
      uri: /api/events//,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/events/verify', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'file is required' });
    }
    const { expectedHash } = req.body;
    const result = verifyBuffer(req.file.buffer, expectedHash);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/events/:batchId/:cid', async (req, res, next) => {
  try {
    const { batchId, cid } = req.params;
    const { file } = await readStoredEvent(batchId, cid);
    res.setHeader('Content-Type', 'application/json');
    return res.send(file);
  } catch (error) {
    next(error);
  }
});

export default router;
