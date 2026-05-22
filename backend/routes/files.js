const express        = require('express');
const router         = express.Router();
const { CodeFile }   = require('../models');

router.get('/', async (req, res) => {
  try {
    const files = await CodeFile.findAll({
      attributes: ['id','title','language','created_at'],
      order: [['created_at','DESC']], limit: 50
    });
    res.json(files);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const file = await CodeFile.findByPk(req.params.id);
    if (!file) return res.status(404).json({ message: 'Not found' });
    res.json(file);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, language, code } = req.body;
    if (!language || !code) return res.status(400).json({ message: 'language and code required' });
    const file = await CodeFile.create({ title: title || 'Untitled', language, code });
    res.status(201).json(file);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const file = await CodeFile.findByPk(req.params.id);
    if (!file) return res.status(404).json({ message: 'Not found' });
    await file.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
