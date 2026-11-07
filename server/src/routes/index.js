const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');

const auth = require('../controllers/authController');
const issues = require('../controllers/issueController');
const production = require('../controllers/productionController');
const master = require('../controllers/masterController');
const dashboard = require('../controllers/dashboardController');
const reports = require('../controllers/reportController');
const activity = require('../controllers/activityController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
});

// Roles: admin > manager > operator > viewer
const WRITE = authorize('admin', 'manager', 'operator');
const MANAGE = authorize('admin', 'manager');
const ADMIN = authorize('admin');

/* ---------- Auth ---------- */
router.post('/auth/login', loginLimiter, auth.login);
router.get('/auth/me', authenticate, auth.me);
router.post('/auth/change-password', authenticate, auth.changePassword);

// Everything below requires a logged-in user.
router.use(authenticate);

/* ---------- Dashboard & reports ---------- */
router.get('/dashboard', dashboard.summary);
router.get('/reports/:type', reports.json);
router.get('/reports/:type/excel', reports.excel);
router.get('/reports/:type/pdf', reports.pdf);

router.get('/activity', activity.list);

/* ---------- Issues ---------- */
router.get('/issues', issues.list);
router.get('/issues/:id', issues.getOne);
router.post('/issues', WRITE, issues.create);
router.put('/issues/:id', WRITE, issues.update);
router.delete('/issues/:id', MANAGE, issues.remove);

/* ---------- Daily production ---------- */
router.get('/production', production.list);
router.post('/production', WRITE, production.create);
router.delete('/production/:id', MANAGE, production.remove);

/* ---------- Master data ---------- */
router.get('/plants', master.plants.list);
router.get('/plants/:id', master.plants.getOne);
router.post('/plants', MANAGE, master.plants.create);
router.put('/plants/:id', MANAGE, master.plants.update);
router.delete('/plants/:id', ADMIN, master.plants.remove);

router.get('/styles', master.styles.list);
router.get('/styles/:id', master.styles.getOne);
router.post('/styles', MANAGE, master.styles.create);
router.put('/styles/:id', MANAGE, master.styles.update);
router.delete('/styles/:id', ADMIN, master.styles.remove);

router.get('/job-sheets', master.jobSheets.list);
router.get('/job-sheets/by-style/:styleId', master.jobSheetsByStyle);
router.get('/job-sheets/:id', master.jobSheets.getOne);
router.post('/job-sheets', MANAGE, master.jobSheets.create);
router.put('/job-sheets/:id', MANAGE, master.jobSheets.update);
router.delete('/job-sheets/:id', ADMIN, master.jobSheets.remove);

/* ---------- Users (admin) ---------- */
router.get('/users', ADMIN, master.listUsers);
router.post('/users', ADMIN, master.createUser);
router.put('/users/:id', ADMIN, master.updateUser);

module.exports = router;
