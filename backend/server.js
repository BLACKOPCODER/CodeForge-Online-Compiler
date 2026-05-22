require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { sequelize } = require('./models');

const app  = express();
const PORT = process.env.PORT || 3000;

// Ensure tmp folder exists
const TMP = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/run',     require('./routes/run'));
app.use('/api/files',   require('./routes/files'));
app.use('/api/history', require('./routes/history'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function start() {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected');
    await sequelize.sync({ alter: true });
    console.log('Tables synced');
    app.listen(PORT, () => console.log(`\nCodeForge running on http://localhost:${PORT}\n`));
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();
