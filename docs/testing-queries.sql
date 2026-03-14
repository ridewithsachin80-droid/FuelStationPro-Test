-- ═══════════════════════════════════════════════════════════════════
-- TESTING & DEBUG SQL QUERIES
-- Use these to verify features and troubleshoot issues
-- ═══════════════════════════════════════════════════════════════════

-- REPLACE 'YOUR_TENANT_ID' with your actual tenant ID (usually 1)
-- REPLACE 'CURRENT_DATE' with specific date like '2026-03-14' if needed

-- ═══════════════════════════════════════════════════════════════════
-- 1. VERIFY DATABASE SETUP
-- ═══════════════════════════════════════════════════════════════════

-- Check if production indexes are applied (should return 17)
SELECT COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';

-- List all indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check connection pool settings
SHOW max_connections;

-- Check database size
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as db_size;

-- ═══════════════════════════════════════════════════════════════════
-- 2. ONE-TAP SHIFT CLOSE - TEST DATA
-- ═══════════════════════════════════════════════════════════════════

-- Check if shift exists
SELECT 
  id,
  shift,
  employee_id,
  date,
  created_at,
  closed_at,
  total_sales,
  transaction_count
FROM shifts
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE
ORDER BY created_at DESC;

-- Check sales for current shift
SELECT 
  COUNT(*) as transaction_count,
  SUM(amount) as total_sales,
  SUM(liters) as total_liters,
  SUM(CASE WHEN mode = 'cash' THEN amount ELSE 0 END) as cash_sales,
  SUM(CASE WHEN mode = 'upi' THEN amount ELSE 0 END) as upi_sales,
  SUM(CASE WHEN mode = 'card' THEN amount ELSE 0 END) as card_sales
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE
  AND shift = 'morning'  -- or 'evening'
  AND employee_id = 1;   -- replace with actual employee ID

-- Get unclosed shifts (for testing alerts)
SELECT 
  s.id,
  s.shift,
  e.name as employee_name,
  s.created_at,
  EXTRACT(EPOCH FROM (NOW() - s.created_at))/3600 as hours_open
FROM shifts s
JOIN employees e ON s.employee_id = e.id AND s.tenant_id = e.tenant_id
WHERE s.tenant_id = YOUR_TENANT_ID
  AND s.closed_at IS NULL
ORDER BY s.created_at ASC;

-- ═══════════════════════════════════════════════════════════════════
-- 3. SMART ALERTS - TEST SCENARIOS
-- ═══════════════════════════════════════════════════════════════════

-- Check for low fuel tanks (should trigger alert)
SELECT 
  id,
  name,
  fuel_type,
  current_level,
  low_alert,
  capacity,
  ROUND((current_level::numeric / capacity::numeric) * 100, 1) as percentage
FROM tanks
WHERE tenant_id = YOUR_TENANT_ID
  AND current_level <= low_alert
ORDER BY percentage ASC;

-- Check today's unclosed cash sales (high cash alert)
SELECT 
  SUM(CASE WHEN mode = 'cash' THEN amount ELSE 0 END) as total_cash
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE
  AND shift NOT IN (
    SELECT shift FROM shifts 
    WHERE tenant_id = YOUR_TENANT_ID 
      AND closed_at IS NOT NULL 
      AND date = CURRENT_DATE
  );
-- If total_cash > 50000, alert should trigger

-- Check alert history
SELECT 
  id,
  action as alert_type,
  details,
  timestamp,
  ip_address
FROM audit_log
WHERE tenant_id = YOUR_TENANT_ID
  AND entity = 'alert'
ORDER BY timestamp DESC
LIMIT 50;

-- ═══════════════════════════════════════════════════════════════════
-- 4. SMART REPORTS - DATA VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

-- Daily summary data
SELECT 
  COUNT(*) as transaction_count,
  SUM(amount) as total_sales,
  SUM(liters) as total_liters,
  SUM(CASE WHEN mode = 'cash' THEN amount ELSE 0 END) as cash_sales,
  SUM(CASE WHEN mode = 'upi' THEN amount ELSE 0 END) as upi_sales,
  SUM(CASE WHEN mode = 'card' THEN amount ELSE 0 END) as card_sales,
  AVG(amount) as avg_ticket_size,
  MIN(amount) as min_sale,
  MAX(amount) as max_sale
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE;

-- Yesterday's sales for comparison
SELECT 
  SUM(amount) as yesterday_total
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE - INTERVAL '1 day';

-- Peak hour analysis
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as transaction_count,
  SUM(amount) as total_sales
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY total_sales DESC
LIMIT 5;

-- Top employee today
SELECT 
  e.name,
  COUNT(s.id) as sales_count,
  SUM(s.amount) as total_sales
FROM sales s
JOIN employees e ON s.employee_id = e.id AND s.tenant_id = e.tenant_id
WHERE s.tenant_id = YOUR_TENANT_ID
  AND s.date = CURRENT_DATE
GROUP BY e.name
ORDER BY total_sales DESC
LIMIT 5;

-- Fuel type breakdown
SELECT 
  fuel_type,
  SUM(liters) as total_liters,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count,
  AVG(rate) as avg_rate
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE
GROUP BY fuel_type
ORDER BY total_amount DESC;

-- ═══════════════════════════════════════════════════════════════════
-- 5. EMPLOYEE PERFORMANCE REPORT
-- ═══════════════════════════════════════════════════════════════════

-- Last 30 days employee performance
SELECT 
  e.id,
  e.name,
  COUNT(s.id) as total_transactions,
  SUM(s.amount) as total_sales,
  SUM(s.liters) as total_liters,
  AVG(s.amount) as avg_ticket_size,
  COUNT(DISTINCT s.date) as days_worked,
  ROUND(SUM(s.amount) / COUNT(DISTINCT s.date), 2) as daily_avg
FROM employees e
LEFT JOIN sales s ON e.id = s.employee_id 
  AND e.tenant_id = s.tenant_id
  AND s.date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE
WHERE e.tenant_id = YOUR_TENANT_ID 
  AND e.active = 1
GROUP BY e.id, e.name
ORDER BY total_sales DESC;

-- ═══════════════════════════════════════════════════════════════════
-- 6. CREATE TEST DATA (for testing features)
-- ═══════════════════════════════════════════════════════════════════

-- Create test sales for today (morning shift, employee 1)
INSERT INTO sales (
  tenant_id, 
  date, 
  shift, 
  employee_id, 
  fuel_type, 
  liters, 
  rate, 
  amount, 
  mode, 
  pump_id, 
  created_at
)
SELECT 
  YOUR_TENANT_ID,
  CURRENT_DATE,
  'morning',
  1,  -- Replace with actual employee ID
  'Petrol',
  10 + (random() * 40)::numeric(10,2),
  102.50,
  (10 + (random() * 40)::numeric(10,2)) * 102.50,
  CASE (random() * 3)::int
    WHEN 0 THEN 'cash'
    WHEN 1 THEN 'upi'
    ELSE 'card'
  END,
  1,  -- Replace with actual pump ID
  NOW() - (random() * INTERVAL '4 hours')
FROM generate_series(1, 20);  -- Creates 20 test sales

-- Create test tank with low fuel (for alert testing)
UPDATE tanks
SET current_level = 400  -- Below default threshold of 500
WHERE tenant_id = YOUR_TENANT_ID
  AND id = 1;  -- Replace with actual tank ID

-- Create unclosed shift (for alert testing)
INSERT INTO shifts (tenant_id, employee_id, shift, date, created_at)
VALUES (
  YOUR_TENANT_ID,
  1,  -- Replace with actual employee ID
  'morning',
  CURRENT_DATE,
  NOW() - INTERVAL '3 hours'  -- 3 hours ago = should trigger alert
);

-- ═══════════════════════════════════════════════════════════════════
-- 7. CLEANUP TEST DATA
-- ═══════════════════════════════════════════════════════════════════

-- Delete test sales
DELETE FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE
  AND created_at > NOW() - INTERVAL '1 hour';

-- Delete test shifts
DELETE FROM shifts
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE
  AND closed_at IS NULL;

-- Reset tank levels
UPDATE tanks
SET current_level = 2000  -- Safe level
WHERE tenant_id = YOUR_TENANT_ID;

-- ═══════════════════════════════════════════════════════════════════
-- 8. PERFORMANCE MONITORING
-- ═══════════════════════════════════════════════════════════════════

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check slow queries (requires pg_stat_statements extension)
-- SELECT query, mean_exec_time, calls
-- FROM pg_stat_statements
-- WHERE mean_exec_time > 100
-- ORDER BY mean_exec_time DESC
-- LIMIT 10;

-- Check active connections
SELECT 
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active,
  COUNT(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = current_database();

-- ═══════════════════════════════════════════════════════════════════
-- 9. TENANT & USER VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

-- List all tenants
SELECT 
  id,
  name,
  created_at,
  active,
  owner_phone,
  manager_phone
FROM tenants
ORDER BY id;

-- List employees for a tenant
SELECT 
  id,
  name,
  role,
  shift,
  active,
  phone,
  CASE WHEN pin_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_pin
FROM employees
WHERE tenant_id = YOUR_TENANT_ID
ORDER BY name;

-- Count records per tenant
SELECT 
  'sales' as table_name,
  COUNT(*) as record_count
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
UNION ALL
SELECT 'employees', COUNT(*)
FROM employees
WHERE tenant_id = YOUR_TENANT_ID
UNION ALL
SELECT 'tanks', COUNT(*)
FROM tanks
WHERE tenant_id = YOUR_TENANT_ID
UNION ALL
SELECT 'pumps', COUNT(*)
FROM pumps
WHERE tenant_id = YOUR_TENANT_ID;

-- ═══════════════════════════════════════════════════════════════════
-- 10. USEFUL AGGREGATIONS
-- ═══════════════════════════════════════════════════════════════════

-- Sales by date (last 7 days)
SELECT 
  date,
  COUNT(*) as transactions,
  SUM(amount) as total_sales,
  SUM(liters) as total_liters
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- Sales by shift (last 7 days)
SELECT 
  shift,
  COUNT(*) as transactions,
  SUM(amount) as total_sales,
  AVG(amount) as avg_ticket
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY shift
ORDER BY shift;

-- Sales by fuel type (last 30 days)
SELECT 
  fuel_type,
  COUNT(*) as transactions,
  SUM(liters) as total_liters,
  SUM(amount) as total_sales,
  AVG(rate) as avg_rate
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY fuel_type
ORDER BY total_sales DESC;

-- Sales by payment mode (last 30 days)
SELECT 
  mode,
  COUNT(*) as transactions,
  SUM(amount) as total_amount,
  ROUND(100.0 * SUM(amount) / (SELECT SUM(amount) FROM sales WHERE tenant_id = YOUR_TENANT_ID AND date >= CURRENT_DATE - INTERVAL '30 days'), 2) as percentage
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY mode
ORDER BY total_amount DESC;

-- ═══════════════════════════════════════════════════════════════════
-- NOTES
-- ═══════════════════════════════════════════════════════════════════
-- 
-- HOW TO USE:
-- 1. Connect to your PostgreSQL database
-- 2. Replace YOUR_TENANT_ID with your actual tenant ID (usually 1)
-- 3. Run queries one at a time
-- 4. Use results to verify features working
-- 
-- SAFETY:
-- - Read-only queries (SELECT) are safe
-- - Test data creation queries are marked
-- - Cleanup queries are provided
-- - Always backup before DELETE/UPDATE in production
-- 
-- DEBUGGING:
-- - If feature not working, run relevant queries
-- - Check if data exists
-- - Verify thresholds met
-- - Look for patterns in results
-- 
-- ═══════════════════════════════════════════════════════════════════
