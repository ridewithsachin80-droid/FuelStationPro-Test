# 🔧 TROUBLESHOOTING GUIDE

**Complete solutions for common deployment and runtime issues**

---

## 📋 TABLE OF CONTENTS

1. [Deployment Issues](#deployment-issues)
2. [Feature Not Working](#feature-not-working)
3. [WhatsApp Issues](#whatsapp-issues)
4. [Auto-Save Issues](#auto-save-issues)
5. [Alert System Issues](#alert-system-issues)
6. [Performance Issues](#performance-issues)
7. [Database Issues](#database-issues)
8. [Testing & Verification](#testing--verification)

---

## 🚨 DEPLOYMENT ISSUES

### Issue 1: Railway Build Fails

**Symptoms:**
- Deployment shows "Failed" status
- Build logs show errors
- App not accessible

**Solutions:**

**Check 1: Syntax Errors in server.js**
```bash
# In Railway logs, look for:
SyntaxError: Unexpected token
```

**Fix:**
1. Review your server.js changes
2. Make sure all brackets `{}` are closed
3. Check for missing commas
4. Verify require() statements at top

**Check 2: Missing Dependencies**
```bash
# Look for:
Cannot find module 'node-fetch'
```

**Fix:**
1. Open package.json
2. Add: `"node-fetch": "^2.6.7"`
3. Commit and push

**Check 3: File Upload Issues**
```bash
# Look for:
Cannot find module './alerts'
```

**Fix:**
1. Verify files uploaded to correct locations:
   - `alerts.js` → `src/alerts.js`
   - `shift-close.js` → `src/shift-close.js`
   - `reports.js` → `src/reports.js`
   - `whatsapp.js` → `src/whatsapp.js`
2. Check file names (case-sensitive!)

---

### Issue 2: Deployment Succeeds But Features Don't Work

**Symptoms:**
- App runs but new endpoints return 404
- Health check doesn't show new features

**Solutions:**

**Check 1: Services Not Initialized**
```bash
# In Railway logs, you should see:
[Server] Enhanced services initialized ✓
```

**If missing:**
1. Open server.js
2. Verify initialization code is AFTER `const db = await initDatabase()`
3. Should look like:
```javascript
const alertsSystem = new AlertsSystem(db);
const shiftCloseService = new ShiftCloseService(db);
...
```

**Check 2: Endpoints Not Added**

Test each endpoint:
```bash
# Should return data, not 404
curl https://your-app/api/health/detailed
curl https://your-app/api/public/daily-report/YOUR_TENANT_ID
```

**If 404:**
1. Verify endpoint code is before `app.listen()`
2. Check for typos in routes
3. Redeploy

---

### Issue 3: Railway Memory/CPU Limits

**Symptoms:**
- App crashes randomly
- "Out of memory" errors
- Very slow response

**Solutions:**

**Check 1: Resource Settings**
```
Railway → Your App → Settings → Resources

Should be:
- Memory: 2GB (minimum 1GB)
- CPU: 1 vCPU
```

**Check 2: Memory Usage**
```bash
curl https://your-app/api/health/detailed

Look for:
"memory": {
  "used": 400,
  "total": 2048
}
```

**If used > 85% of total:**
- Upgrade to 2GB or 4GB RAM
- Check for memory leaks in logs

---

## ❌ FEATURE NOT WORKING

### Issue 4: One-Tap Shift Close Returns Error

**Symptoms:**
```json
{
  "error": "Shift already closed"
}
```

**Solutions:**

**Check if shift actually closed:**
```sql
SELECT * FROM shifts 
WHERE tenant_id = YOUR_TENANT_ID 
  AND employee_id = EMPLOYEE_ID 
  AND shift = 'morning' 
  AND date = CURRENT_DATE;
```

**If closed_at is NOT NULL:**
- Shift already closed
- This is correct behavior
- Open new shift for testing

**Check if employee has sales:**
```sql
SELECT COUNT(*) FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND employee_id = EMPLOYEE_ID
  AND shift = 'morning'
  AND date = CURRENT_DATE;
```

**If count = 0:**
- Create some test sales first
- Then try closing shift

---

### Issue 5: Reports Show Zero/Empty Data

**Symptoms:**
```json
{
  "totalSales": 0,
  "transactionCount": 0
}
```

**Solutions:**

**Check 1: Date Format**
```bash
# Make sure date is YYYY-MM-DD format
curl https://your-app/api/public/daily-report/TENANT_ID?date=2026-03-14

# Not:
?date=14-03-2026  # Wrong!
```

**Check 2: Data Exists**
```sql
SELECT * FROM sales 
WHERE tenant_id = YOUR_TENANT_ID 
  AND date = CURRENT_DATE
LIMIT 5;
```

**If no rows:**
- Create test sales in database
- Or use yesterday's date for testing

**Check 3: Tenant ID Correct**
```bash
# Check your tenant ID:
SELECT id, name FROM tenants WHERE id = YOUR_TENANT_ID;

# Should return 1 row
```

---

## 📱 WHATSAPP ISSUES

### Issue 6: WhatsApp Not Sending

**Symptoms:**
- No WhatsApp messages received
- Logs show: `[WhatsApp] Skipped (not configured)`

**Solutions:**

**Check 1: API Key Set**
```bash
# In Railway:
Railway → Variables → Look for WHATSAPP_API_KEY

# Should have a value
```

**If not set:**
1. Get API key from CallMeBot:
   - Save number: +34 644 17 76 66
   - Send: "I allow callmebot to send me messages"
   - Receive API key
2. Add to Railway variables
3. Redeploy

**Check 2: Phone Number Format**
```javascript
// CORRECT:
+919876543210

// WRONG:
9876543210     // Missing country code
+91 9876543210 // Has space
919876543210   // Missing +
```

**Check 3: CallMeBot Activated**
```
1. Did you save the number?
2. Did you send the activation message?
3. Did you receive the API key?
```

**Test manually:**
```bash
curl -X POST https://your-app/api/public/test-alert/TENANT_ID \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210", "message":"Test"}'
```

---

### Issue 7: WhatsApp Messages Delayed

**Symptoms:**
- Messages arrive 5-10 minutes late

**Solutions:**

**This is normal!**
- CallMeBot free tier has slight delays
- Usually 1-5 minutes
- For instant delivery, use paid Twilio

**Workaround:**
- Alerts still fire on time
- Just notification is delayed
- Users get the alert eventually

---

## 💾 AUTO-SAVE ISSUES

### Issue 8: Auto-Save Not Working

**Symptoms:**
- Form data not saving
- No "Draft saved" indicator
- Data lost on refresh

**Solutions:**

**Check 1: Script Loaded**
```html
<!-- In index.html, before </body> -->
<script src="/autosave.js"></script>
```

**Test:**
```javascript
// In browser console:
console.log(typeof AutoSave);

// Should print: "object"
// If "undefined", script not loaded
```

**Check 2: Form Registered**
```javascript
// In employee.js or wherever form is created:
AutoSave.register('sales-form', ['liters', 'amount', ...]);

// Should see in console:
// [AutoSave] Registered form: sales-form
```

**Check 3: localStorage Enabled**
```javascript
// In browser console:
localStorage.setItem('test', '123');
console.log(localStorage.getItem('test'));

// Should print: "123"
```

**If error:**
- User might be in private/incognito mode
- localStorage disabled in browser settings
- Ask user to use normal mode

**Check 4: Field IDs Correct**
```javascript
// Make sure field IDs match:
AutoSave.register('sales-form', [
  'liters',  // <input id="liters">
  'amount',  // <input id="amount">
  ...
]);
```

---

### Issue 9: Draft Not Restoring

**Symptoms:**
- "Continue work?" prompt doesn't appear
- Or appears but fields stay empty

**Solutions:**

**Check 1: Draft Exists**
```javascript
// In browser console:
AutoSave.getAllDrafts();

// Should show saved drafts
```

**Check 2: Not Expired**
```javascript
// Drafts expire after 24 hours
// Check timestamp:
const draft = JSON.parse(localStorage.getItem('draft_sales-form'));
console.log(new Date(draft.timestamp));
```

**Check 3: Field IDs Match**
```javascript
// Saved field IDs must match current form
// If you renamed a field, draft won't restore
```

---

## 🔔 ALERT SYSTEM ISSUES

### Issue 10: Alerts Not Triggering

**Symptoms:**
- Tank low but no alert
- High cash but no alert
- No alerts in history

**Solutions:**

**Check 1: Alert System Started**
```bash
# In Railway logs:
[Alerts] Starting alert monitoring system...
[Alerts] Alert monitoring started

# If missing, alerts aren't running
```

**Fix:**
1. Check server.js has:
```javascript
alertsSystem.start();
```
2. Should be before `app.listen()`
3. Redeploy if missing

**Check 2: Conditions Met**
```sql
-- Check tank levels:
SELECT name, current_level, low_alert
FROM tanks
WHERE tenant_id = YOUR_TENANT_ID
  AND current_level <= low_alert;

-- Should return rows for alert to fire
```

**For low fuel alert:**
- Tank must be <= low_alert threshold
- Default: 500L
- Check `alerts.js` for your threshold

**For high cash alert:**
```sql
-- Check today's cash sales:
SELECT SUM(amount) as cash_total
FROM sales
WHERE tenant_id = YOUR_TENANT_ID
  AND date = CURRENT_DATE
  AND mode = 'cash'
  AND shift NOT IN (
    SELECT shift FROM shifts 
    WHERE closed_at IS NOT NULL 
      AND date = CURRENT_DATE
  );

-- Should be > 50000 for alert
```

**Check 3: Timing**
```
Alerts check:
- Low fuel: Every 30 minutes
- High cash: Every 15 minutes
- Unclosed shifts: Every 1 hour

Wait for next check cycle
```

**Force manual check (testing):**
```javascript
// Add temporary endpoint in server.js:
app.get('/api/debug/check-alerts/:tenantId', async (req, res) => {
  await alertsSystem.checkLowFuel();
  await alertsSystem.checkHighCash();
  await alertsSystem.checkUnclosedShifts();
  res.json({ message: 'Checks completed' });
});
```

---

### Issue 11: Too Many Alerts

**Symptoms:**
- Getting alerts every 15 minutes for same issue
- Alert fatigue

**Solutions:**

**This is expected behavior!**
- Alerts repeat until issue is resolved
- Low fuel? Fill tank to stop alerts
- High cash? Deposit to stop alerts
- Unclosed shift? Close it to stop alerts

**To reduce frequency:**

Edit `alerts.js`:
```javascript
// Change intervals:
setInterval(() => this.checkLowFuel(), 60 * 60 * 1000); // 1 hour instead of 30 min
setInterval(() => this.checkHighCash(), 30 * 60 * 1000); // 30 min instead of 15 min
```

**To adjust thresholds:**

Edit `alerts.js`:
```javascript
this.alertThresholds = {
  lowFuel: 300,    // Changed from 500
  highCash: 75000, // Changed from 50000
  ...
};
```

---

## 🐌 PERFORMANCE ISSUES

### Issue 12: Slow API Responses

**Symptoms:**
- Requests take > 1 second
- Timeouts
- Users complaining of slowness

**Solutions:**

**Check 1: Database Response Time**
```bash
curl https://your-app/api/health/detailed

Look for:
"database": {
  "responseTime": 45  // Should be < 100ms
}
```

**If > 100ms:**
- Database might be overloaded
- Check Railway database settings
- Consider upgrading database

**Check 2: Missing Indexes**
```sql
-- Check if production indexes applied:
SELECT COUNT(*) 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';

-- Should return 17
```

**If < 17:**
- Run `production-indexes.sql`
- See previous deployment guide

**Check 3: Connection Pool**
```bash
curl https://your-app/api/health/detailed

Look for:
"pool": {
  "total": 150,
  "idle": 80
}
```

**If idle < 20:**
- Pool exhausted
- Increase max in schema.js
- Or upgrade database

**Check 4: Alert Overhead**
```
Alerts use minimal resources
But if concerned, increase check intervals
```

---

## 💥 DATABASE ISSUES

### Issue 13: Database Connection Failed

**Symptoms:**
```
[DB] Connection error
status: "unhealthy"
database: "error"
```

**Solutions:**

**Check 1: DATABASE_URL Set**
```bash
# In Railway:
Railway → Variables → DATABASE_URL

# Should be set automatically
```

**If missing:**
- Postgres service might be detached
- Reconnect in Railway dashboard

**Check 2: Database Online**
```bash
# Try connecting via Railway CLI:
railway connect Postgres

# Should open psql
```

**Check 3: Connection Pool Settings**

In `schema.js`:
```javascript
max: 150,  // Not too high (>500)
min: 20,   // Not 0
```

---

### Issue 14: Query Timeout Errors

**Symptoms:**
```
Error: Query timeout after 15000ms
```

**Solutions:**

**Check 1: Query Performance**
```sql
-- Find slow queries:
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Check 2: Missing Indexes**
- Apply production-indexes.sql
- See deployment guide

**Check 3: Large Dataset**
```sql
-- Check table sizes:
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**If sales table > 1GB:**
- Consider archiving old data
- Or upgrade database

---

## ✅ TESTING & VERIFICATION

### Test Checklist

**After deployment, test each feature:**

```bash
# 1. Health Check
curl https://your-app/api/health/detailed

# Should show:
# "smartAlerts": true
# "shiftClose": true
# "reports": true
# "whatsapp": true (if API key set)

# 2. Daily Report
curl https://your-app/api/public/daily-report/YOUR_TENANT_ID

# Should return JSON with sales data

# 3. Shift Close
curl -X POST https://your-app/api/public/auto-close-shift/YOUR_TENANT_ID \
  -H "Content-Type: application/json" \
  -d '{"employeeId":1, "shift":"morning"}'

# Should return shift summary

# 4. Alert History
curl https://your-app/api/public/alert-history/YOUR_TENANT_ID

# Should return array (might be empty if no alerts yet)

# 5. WhatsApp Test (if configured)
curl -X POST https://your-app/api/public/test-alert/YOUR_TENANT_ID \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210", "message":"Test"}'

# Should send WhatsApp message
```

---

## 🆘 STILL STUCK?

### Debug Checklist

1. **Check Railway Logs**
   - Railway → Deployments → Latest → Logs
   - Look for errors marked [err] or [error]

2. **Check Browser Console**
   - F12 → Console tab
   - Look for JavaScript errors

3. **Test Health Endpoint**
   ```bash
   curl https://your-app/api/health/detailed | jq
   ```

4. **Verify Environment Variables**
   - Railway → Variables
   - Check all required vars set

5. **Check File Locations**
   - GitHub → src folder
   - Verify all files uploaded

6. **Database Connection**
   ```bash
   railway connect Postgres
   # Should connect
   ```

7. **Test Locally**
   ```bash
   # Clone repo
   # npm install
   # npm start
   # Test on localhost
   ```

---

## 📞 GETTING HELP

### Information to Collect

When reporting issues, provide:

1. **Error Message**
   - Exact error text
   - From logs or browser console

2. **Railway Logs**
   - Last 50 lines
   - Around time of error

3. **What You Did**
   - Steps to reproduce
   - Expected vs actual behavior

4. **Environment**
   - Which feature not working
   - Browser (if frontend issue)
   - When deployed

5. **Verification Results**
   - Health check output
   - Test endpoint results

---

## 🎯 PREVENTION

### Best Practices

1. **Test Before Deploy**
   - Read guides completely
   - Check syntax
   - Review changes

2. **Deploy Incrementally**
   - One feature at a time
   - Test each before next
   - Easier to debug

3. **Monitor After Deploy**
   - Watch logs for 30 minutes
   - Test all features
   - Check health endpoint

4. **Keep Backups**
   - GitHub has version history
   - Can rollback if needed
   - Railway can redeploy old version

5. **Document Changes**
   - Note what you changed
   - Track configuration
   - Helps troubleshooting

---

**Most issues are simple:**
- Missing file upload
- Syntax error in server.js
- Environment variable not set
- Waiting for alert check cycle

**Fix 95% of issues by:**
1. Reading error message carefully
2. Checking Railway logs
3. Verifying file uploads
4. Testing health endpoint

**You got this!** 🚀
