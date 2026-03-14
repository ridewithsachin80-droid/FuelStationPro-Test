/**
 * Enhanced Server.js - Additions for 5 New Features
 * 
 * This file contains the code additions to integrate into your existing server.js
 * 
 * Features Added:
 * 1. One-Tap Shift Close
 * 2. Smart Alerts
 * 3. Auto-Save Drafts (frontend)
 * 4. WhatsApp Integration  
 * 5. Smart Reports
 * 
 * INSTRUCTIONS:
 * 1. Add imports at the top of server.js (after line 13)
 * 2. Initialize services after db initialization (after line 22)
 * 3. Add new API endpoints before app.listen() (around line 1300)
 * 4. Start alert system before app.listen()
 */

// ═══════════════════════════════════════════════════════════════════
// STEP 1: ADD THESE IMPORTS AT THE TOP (after line 13 in server.js)
// ═══════════════════════════════════════════════════════════════════

const AlertsSystem = require('./alerts');
const ShiftCloseService = require('./shift-close');
const ReportsService = require('./reports');
const whatsapp = require('./whatsapp');

// ═══════════════════════════════════════════════════════════════════
// STEP 2: INITIALIZE SERVICES (add after line 22: const db = await initDatabase())
// ═══════════════════════════════════════════════════════════════════

// Initialize new services
const alertsSystem = new AlertsSystem(db);
const shiftCloseService = new ShiftCloseService(db);
const reportsService = new ReportsService(db);

// Store in app.locals for route access
app.locals.alertsSystem = alertsSystem;
app.locals.shiftCloseService = shiftCloseService;
app.locals.reportsService = reportsService;

console.log('[Server] Enhanced services initialized:');
console.log('[Server] - Smart Alerts System ✓');
console.log('[Server] - One-Tap Shift Close ✓');
console.log('[Server] - Smart Reports ✓');
console.log('[Server] - WhatsApp Integration ✓');

// ═══════════════════════════════════════════════════════════════════
// STEP 3: ADD ENHANCED HEALTH CHECK ENDPOINT (replace existing /api/health)
// ═══════════════════════════════════════════════════════════════════

// Enhanced health check with detailed metrics
app.get('/api/health/detailed', async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const dbResponseTime = Date.now() - start;

    const poolStats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    };

    const memoryUsage = process.memoryUsage();
    const memoryStats = {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
    };

    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.2.1',
      uptime: Math.round(process.uptime()),
      memory: memoryStats,
      database: {
        connected: true,
        responseTime: dbResponseTime,
        pool: poolStats
      },
      features: {
        smartAlerts: true,
        shiftClose: true,
        reports: true,
        whatsapp: whatsapp.enabled
      }
    };

    // Add warnings
    const warnings = [];
    if (poolStats.total > 0 && (poolStats.idle / poolStats.total) < 0.2) {
      warnings.push('Pool utilization >80%');
    }
    if (memoryStats.used / memoryStats.total > 0.85) {
      warnings.push('Memory usage >85%');
    }
    if (dbResponseTime > 100) {
      warnings.push('Slow database response');
    }

    if (warnings.length > 0) {
      status.warnings = warnings;
      status.status = 'warning';
    }

    res.json(status);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4: ADD NEW API ENDPOINTS (add before app.listen(), around line 1300)
// ═══════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────
// ONE-TAP SHIFT CLOSE ENDPOINTS
// ────────────────────────────────────────────────────────────────────

/**
 * POST /api/public/auto-close-shift/:tenantId
 * One-tap shift close - Auto-calculates everything
 */
app.post('/api/public/auto-close-shift/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, shift, date } = req.body;

    if (!employeeId || !shift) {
      return res.status(400).json({ error: 'employeeId and shift required' });
    }

    const result = await app.locals.shiftCloseService.autoCloseShift(
      tenantId,
      employeeId,
      shift,
      date
    );

    res.json(result);
  } catch (error) {
    console.error('[API] Auto-close shift error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/shift-summary/:tenantId/:shiftId
 * Get shift summary
 */
app.get('/api/public/shift-summary/:tenantId/:shiftId', async (req, res) => {
  try {
    const { tenantId, shiftId } = req.params;
    
    const summary = await app.locals.shiftCloseService.getShiftSummary(
      tenantId,
      parseInt(shiftId)
    );

    if (!summary) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(summary);
  } catch (error) {
    console.error('[API] Get shift summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/unclosed-shifts/:tenantId
 * Get all unclosed shifts
 */
app.get('/api/public/unclosed-shifts/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const shifts = await app.locals.shiftCloseService.getUnclosedShifts(tenantId);
    
    res.json(shifts);
  } catch (error) {
    console.error('[API] Get unclosed shifts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ────────────────────────────────────────────────────────────────────
// SMART REPORTS ENDPOINTS
// ────────────────────────────────────────────────────────────────────

/**
 * GET /api/public/daily-report/:tenantId
 * Generate daily summary report
 */
app.get('/api/public/daily-report/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { date } = req.query;
    
    const report = await app.locals.reportsService.generateDailyReport(
      tenantId,
      date
    );

    res.json(report);
  } catch (error) {
    console.error('[API] Daily report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/shift-report/:tenantId/:shiftId
 * Generate shift report
 */
app.get('/api/public/shift-report/:tenantId/:shiftId', async (req, res) => {
  try {
    const { tenantId, shiftId } = req.params;
    
    const report = await app.locals.reportsService.generateShiftReport(
      tenantId,
      parseInt(shiftId)
    );

    res.json(report);
  } catch (error) {
    console.error('[API] Shift report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/employee-performance/:tenantId
 * Generate employee performance report
 */
app.get('/api/public/employee-performance/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate required' });
    }

    const report = await app.locals.reportsService.generateEmployeePerformanceReport(
      tenantId,
      startDate,
      endDate
    );

    res.json(report);
  } catch (error) {
    console.error('[API] Employee performance report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/fuel-analysis/:tenantId
 * Generate fuel consumption analysis
 */
app.get('/api/public/fuel-analysis/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate required' });
    }

    const report = await app.locals.reportsService.generateFuelAnalysisReport(
      tenantId,
      startDate,
      endDate
    );

    res.json(report);
  } catch (error) {
    console.error('[API] Fuel analysis report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/public/send-daily-report/:tenantId
 * Send daily report via WhatsApp
 */
app.post('/api/public/send-daily-report/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { phone, date } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'phone required' });
    }

    const report = await app.locals.reportsService.generateDailyReport(tenantId, date);
    const sent = await whatsapp.sendDailyReport(phone, report);

    res.json({ success: sent, report });
  } catch (error) {
    console.error('[API] Send daily report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ────────────────────────────────────────────────────────────────────
// ALERTS ENDPOINTS
// ────────────────────────────────────────────────────────────────────

/**
 * GET /api/public/alert-history/:tenantId
 * Get alert history
 */
app.get('/api/public/alert-history/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { limit } = req.query;
    
    const history = await app.locals.alertsSystem.getAlertHistory(
      tenantId,
      limit ? parseInt(limit) : 50
    );

    res.json(history);
  } catch (error) {
    console.error('[API] Alert history error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/public/test-alert/:tenantId
 * Test WhatsApp alert (development only)
 */
app.post('/api/public/test-alert/:tenantId', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone and message required' });
    }

    const sent = await whatsapp.send(phone, message);
    
    res.json({ success: sent });
  } catch (error) {
    console.error('[API] Test alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// STEP 5: START ALERT MONITORING (add before app.listen())
// ═══════════════════════════════════════════════════════════════════

// Start alert monitoring system
alertsSystem.start();

// Graceful shutdown - stop alerts
const cleanup = () => {
  console.log('\n[Server] Shutting down gracefully...');
  alertsSystem.stop();
  process.exit(0);
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// ═══════════════════════════════════════════════════════════════════
// STEP 6: UPDATE RATE LIMIT (find and replace around line 69)
// ═══════════════════════════════════════════════════════════════════

// REPLACE THIS LINE:
// app.use(rateLimit({ windowMs: 60000, max: 500, standardHeaders: true, legacyHeaders: false }));

// WITH THIS:
const globalRateLimiter = rateLimit({
  windowMs: 60000,
  max: 5000, // Increased from 500 to 5000 req/min
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health' || req.path === '/api/health/detailed';
  },
  keyGenerator: (req) => {
    // Per-tenant rate limiting for fairness
    const tenantId = req.params.tenantId || req.path.split('/')[3];
    return `${req.ip}-${tenantId || 'global'}`;
  },
  message: { error: 'Rate limit exceeded. Please slow down.' }
});

app.use(globalRateLimiter);

// ═══════════════════════════════════════════════════════════════════
// END OF ADDITIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * SUMMARY OF CHANGES:
 * 
 * 1. Import new modules (alerts, shift-close, reports, whatsapp)
 * 2. Initialize services after database connection
 * 3. Add enhanced /api/health/detailed endpoint
 * 4. Add shift close endpoints:
 *    - POST /api/public/auto-close-shift/:tenantId
 *    - GET /api/public/shift-summary/:tenantId/:shiftId
 *    - GET /api/public/unclosed-shifts/:tenantId
 * 5. Add reports endpoints:
 *    - GET /api/public/daily-report/:tenantId
 *    - GET /api/public/shift-report/:tenantId/:shiftId
 *    - GET /api/public/employee-performance/:tenantId
 *    - GET /api/public/fuel-analysis/:tenantId
 *    - POST /api/public/send-daily-report/:tenantId
 * 6. Add alerts endpoints:
 *    - GET /api/public/alert-history/:tenantId
 *    - POST /api/public/test-alert/:tenantId
 * 7. Start alert monitoring system
 * 8. Update rate limit to 5000 req/min
 * 9. Add graceful shutdown handlers
 */

module.exports = {
  // Export for testing if needed
  AlertsSystem,
  ShiftCloseService,
  ReportsService,
  whatsapp
};
