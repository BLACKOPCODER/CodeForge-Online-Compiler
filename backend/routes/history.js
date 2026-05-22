const express        = require('express');
const router         = express.Router();
const { RunHistory } = require('../models');

router.get('/', async (req, res) => {
  try {
    const rows = await RunHistory.findAll({
      attributes: ['id','language','code','exit_code','execution_time','ran_at'],
      order: [['ran_at','DESC']], limit: 100
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/', async (req, res) => {
  try {
    await RunHistory.destroy({ where: {} });
    res.json({ message: 'Cleared' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
