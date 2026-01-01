const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');

// TODO: Implement video controller
router.use(authenticate);

router.get('/', (req, res) => {
    res.json({ status: 'success', message: 'Video routes - Coming soon' });
});

module.exports = router;
