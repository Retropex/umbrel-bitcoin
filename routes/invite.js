const express = require('express');
const router = express.Router();
const fs = require('fs');
const constants = require('../utils/const');

router.get('/invite', async (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(constants.JSON_STORE_FILE, 'utf8'));
    res.json({ showInviteSettings: !!data.showInviteSettings });
  } catch (e) {
    res.json({ showInviteSettings: true });
  }
});

router.post('/invite', async (req, res) => {
  try {
    const data = fs.existsSync(constants.JSON_STORE_FILE)
      ? JSON.parse(fs.readFileSync(constants.JSON_STORE_FILE, 'utf8'))
      : {};
    data.showInviteSettings = !!req.body.showInviteSettings;
    fs.writeFileSync(constants.JSON_STORE_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;