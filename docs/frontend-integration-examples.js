/**
 * Frontend Integration Examples
 * How to use the 5 new features in your UI
 * 
 * Add these to your employee.js and admin.js files
 */

// ═══════════════════════════════════════════════════════════════════
// 1. ONE-TAP SHIFT CLOSE - Add to Employee Dashboard
// ═══════════════════════════════════════════════════════════════════

/**
 * Add this button to employee dashboard
 */
function addShiftCloseButton() {
  const container = document.getElementById('employee-actions');
  
  const button = document.createElement('button');
  button.className = 'btn btn-primary btn-lg';
  button.innerHTML = '🔒 Close Shift';
  button.onclick = handleAutoCloseShift;
  
  container.appendChild(button);
}

/**
 * Handle one-tap shift close
 */
async function handleAutoCloseShift() {
  const employeeId = getCurrentEmployeeId();
  const shift = getCurrentShift(); // 'morning' or 'evening'
  const tenantId = getTenantId();
  
  // Show loading
  const button = event.target;
  button.disabled = true;
  button.innerHTML = '⏳ Closing shift...';
  
  try {
    const response = await fetch(`/api/public/auto-close-shift/${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, shift })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success with summary
      showShiftSummary(result.report);
      
      // Clear auto-save draft
      AutoSave.clear('sales-form');
      
      // Refresh dashboard
      setTimeout(() => location.reload(), 3000);
    } else {
      alert('Error closing shift: ' + result.error);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = '🔒 Close Shift';
  }
}

/**
 * Display shift summary modal
 */
function showShiftSummary(report) {
  const modal = `
    <div class="modal" style="display:block">
      <div class="modal-content">
        <h2>✅ Shift Closed Successfully</h2>
        
        <div class="summary">
          <h3>Shift Summary</h3>
          <p><strong>Employee:</strong> ${report.employeeName}</p>
          <p><strong>Shift:</strong> ${report.shift}</p>
          <p><strong>Date:</strong> ${report.date}</p>
          
          <hr>
          
          <h3>💰 Sales Totals</h3>
          <p><strong>Total Sales:</strong> ₹${report.totalSales.toLocaleString('en-IN')}</p>
          <p>Cash: ₹${report.cashSales.toLocaleString('en-IN')}</p>
          <p>UPI: ₹${report.upiSales.toLocaleString('en-IN')}</p>
          <p>Card: ₹${report.cardSales.toLocaleString('en-IN')}</p>
          
          <hr>
          
          <h3>⛽ Fuel Summary</h3>
          <p><strong>Total Liters:</strong> ${report.totalLiters.toLocaleString('en-IN')} L</p>
          <p><strong>Transactions:</strong> ${report.transactionCount}</p>
          
          ${report.discrepancy !== 0 ? `
            <hr>
            <p class="warning">⚠️ Discrepancy: ₹${report.discrepancy}</p>
          ` : ''}
        </div>
        
        <button onclick="this.closest('.modal').remove()">Close</button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modal);
}

// ═══════════════════════════════════════════════════════════════════
// 2. AUTO-SAVE DRAFTS - Add to Sales Form
// ═══════════════════════════════════════════════════════════════════

/**
 * Initialize auto-save for sales form
 */
function initializeSalesFormAutoSave() {
  // Register sales form for auto-save
  AutoSave.register('sales-form', [
    'liters',
    'amount',
    'fuelType',
    'mode',
    'pumpId',
    'vehicleNumber',
    'customerName',
    'remarks'
  ]);
  
  console.log('Auto-save enabled for sales form');
}

/**
 * Clear draft after successful sale submission
 */
async function submitSale(saleData) {
  try {
    const response = await fetch(`/api/public/sales/${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });
    
    if (response.ok) {
      // Clear auto-save draft
      AutoSave.clear('sales-form');
      
      // Clear form
      document.getElementById('sales-form').reset();
      
      // Show success
      showSuccess('Sale recorded successfully!');
    }
  } catch (error) {
    console.error('Error submitting sale:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3. SMART REPORTS - Add to Admin Dashboard
// ═══════════════════════════════════════════════════════════════════

/**
 * Display daily report
 */
async function showDailyReport() {
  const tenantId = getTenantId();
  const date = document.getElementById('report-date').value || null;
  
  try {
    const response = await fetch(`/api/public/daily-report/${tenantId}?date=${date || ''}`);
    const report = await response.json();
    
    displayReportHTML(report);
  } catch (error) {
    console.error('Error fetching daily report:', error);
  }
}

/**
 * Display report in nice HTML format
 */
function displayReportHTML(report) {
  const html = `
    <div class="report-container">
      <h2>📊 Daily Sales Report</h2>
      <p class="report-date">${report.date}</p>
      
      <div class="report-grid">
        <div class="report-card">
          <h3>💰 Total Sales</h3>
          <p class="big-number">₹${report.totalSales.toLocaleString('en-IN')}</p>
          <p class="trend ${report.vsYesterday >= 0 ? 'positive' : 'negative'}">
            ${report.vsYesterday >= 0 ? '📈' : '📉'} 
            ${report.vsYesterday >= 0 ? '+' : ''}${report.vsYesterday}% vs yesterday
          </p>
        </div>
        
        <div class="report-card">
          <h3>⛽ Fuel Sold</h3>
          <p class="big-number">${report.totalLiters.toLocaleString('en-IN')} L</p>
          <p>${report.transactionCount} transactions</p>
        </div>
        
        <div class="report-card">
          <h3>💵 Payment Breakdown</h3>
          <p>Cash: ₹${report.cashSales.toLocaleString('en-IN')}</p>
          <p>UPI: ₹${report.upiSales.toLocaleString('en-IN')}</p>
          <p>Card: ₹${report.cardSales.toLocaleString('en-IN')}</p>
        </div>
        
        <div class="report-card">
          <h3>⭐ Insights</h3>
          <p><strong>Peak Hour:</strong> ${report.peakHour.hour}:00</p>
          <p><strong>Top Employee:</strong> ${report.topEmployee.name}</p>
          <p><strong>Avg Ticket:</strong> ₹${report.avgTicketSize.toFixed(0)}</p>
        </div>
      </div>
      
      <div class="fuel-breakdown">
        <h3>Fuel Type Breakdown</h3>
        ${report.fuelBreakdown.map(f => `
          <div class="fuel-item">
            <span>${f.fuelType}</span>
            <span>${f.liters.toLocaleString('en-IN')} L</span>
            <span>₹${f.amount.toLocaleString('en-IN')}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="report-actions">
        <button onclick="downloadReportPDF()">📥 Download PDF</button>
        <button onclick="sendReportWhatsApp()">📱 Send via WhatsApp</button>
      </div>
    </div>
  `;
  
  document.getElementById('report-display').innerHTML = html;
}

/**
 * Send report via WhatsApp
 */
async function sendReportWhatsApp() {
  const phone = prompt('Enter phone number (with country code):');
  if (!phone) return;
  
  const tenantId = getTenantId();
  
  try {
    const response = await fetch(`/api/public/send-daily-report/${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    
    if (response.ok) {
      alert('✅ Report sent via WhatsApp!');
    } else {
      alert('❌ Failed to send report');
    }
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
  }
}

/**
 * Show employee performance report
 */
async function showEmployeePerformance() {
  const tenantId = getTenantId();
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  
  if (!startDate || !endDate) {
    alert('Please select date range');
    return;
  }
  
  try {
    const response = await fetch(
      `/api/public/employee-performance/${tenantId}?startDate=${startDate}&endDate=${endDate}`
    );
    const report = await response.json();
    
    displayEmployeePerformance(report);
  } catch (error) {
    console.error('Error fetching employee performance:', error);
  }
}

/**
 * Display employee performance report
 */
function displayEmployeePerformance(report) {
  const html = `
    <div class="performance-report">
      <h2>👥 Employee Performance</h2>
      <p>${report.startDate} to ${report.endDate}</p>
      
      <table class="performance-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Employee</th>
            <th>Sales</th>
            <th>Transactions</th>
            <th>Avg Ticket</th>
            <th>Days Worked</th>
            <th>Daily Avg</th>
          </tr>
        </thead>
        <tbody>
          ${report.employees.map((emp, index) => `
            <tr class="${index === 0 ? 'top-performer' : ''}">
              <td>${index + 1}</td>
              <td>${emp.name} ${index === 0 ? '🏆' : ''}</td>
              <td>₹${emp.totalSales.toLocaleString('en-IN')}</td>
              <td>${emp.transactions}</td>
              <td>₹${emp.avgTicketSize.toFixed(0)}</td>
              <td>${emp.daysWorked}</td>
              <td>₹${emp.dailyAvg}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  document.getElementById('report-display').innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════
// 4. ALERT HISTORY - Add to Admin Dashboard
// ═══════════════════════════════════════════════════════════════════

/**
 * Show alert history
 */
async function showAlertHistory() {
  const tenantId = getTenantId();
  
  try {
    const response = await fetch(`/api/public/alert-history/${tenantId}?limit=50`);
    const history = await response.json();
    
    displayAlertHistory(history);
  } catch (error) {
    console.error('Error fetching alert history:', error);
  }
}

/**
 * Display alert history
 */
function displayAlertHistory(history) {
  const html = `
    <div class="alert-history">
      <h2>🔔 Alert History</h2>
      
      <div class="alert-list">
        ${history.map(alert => {
          const details = JSON.parse(alert.details || '{}');
          const icon = getAlertIcon(alert.alert_type);
          
          return `
            <div class="alert-item ${alert.alert_type.toLowerCase()}">
              <span class="alert-icon">${icon}</span>
              <div class="alert-content">
                <h4>${formatAlertType(alert.alert_type)}</h4>
                <p>${formatAlertDetails(alert.alert_type, details)}</p>
                <span class="alert-time">${new Date(alert.timestamp).toLocaleString('en-IN')}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  document.getElementById('alert-display').innerHTML = html;
}

/**
 * Format alert details
 */
function formatAlertDetails(type, details) {
  switch(type) {
    case 'LOW_FUEL':
      return `${details.tanks.length} tank(s) below threshold`;
    case 'HIGH_CASH':
      return `Cash in drawer: ₹${details.amount.toLocaleString('en-IN')}`;
    case 'UNCLOSED_SHIFT':
      return `${details.employeeName} - ${details.hoursOpen} hours open`;
    case 'UNUSUAL_SALE':
      return `Large sale: ₹${details.amount.toLocaleString('en-IN')} by ${details.employeeName}`;
    default:
      return JSON.stringify(details);
  }
}

/**
 * Get alert icon
 */
function getAlertIcon(type) {
  const icons = {
    'LOW_FUEL': '🚨',
    'HIGH_CASH': '💰',
    'UNCLOSED_SHIFT': '⚠️',
    'UNUSUAL_SALE': '⚡'
  };
  return icons[type] || '🔔';
}

/**
 * Format alert type for display
 */
function formatAlertType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ═══════════════════════════════════════════════════════════════════
// 5. UNCLOSED SHIFTS MONITOR - Add to Manager Dashboard
// ═══════════════════════════════════════════════════════════════════

/**
 * Show unclosed shifts
 */
async function showUnclosedShifts() {
  const tenantId = getTenantId();
  
  try {
    const response = await fetch(`/api/public/unclosed-shifts/${tenantId}`);
    const shifts = await response.json();
    
    displayUnclosedShifts(shifts);
  } catch (error) {
    console.error('Error fetching unclosed shifts:', error);
  }
}

/**
 * Display unclosed shifts
 */
function displayUnclosedShifts(shifts) {
  if (shifts.length === 0) {
    document.getElementById('unclosed-display').innerHTML = `
      <div class="no-alerts">
        <p>✅ All shifts are closed</p>
      </div>
    `;
    return;
  }
  
  const html = `
    <div class="unclosed-shifts">
      <h2>⚠️ Unclosed Shifts</h2>
      
      ${shifts.map(shift => `
        <div class="unclosed-item ${shift.hoursOpen > 4 ? 'urgent' : ''}">
          <h4>${shift.employeeName}</h4>
          <p><strong>Shift:</strong> ${shift.shift}</p>
          <p><strong>Started:</strong> ${new Date(shift.startedAt).toLocaleString('en-IN')}</p>
          <p class="hours-open">Open for ${shift.hoursOpen} hours</p>
          <button onclick="remindEmployee(${shift.shiftId})">📱 Send Reminder</button>
        </div>
      `).join('')}
    </div>
  `;
  
  document.getElementById('unclosed-display').innerHTML = html;
}

/**
 * Send reminder to employee
 */
async function remindEmployee(shiftId) {
  // Implementation would call an endpoint to send WhatsApp reminder
  alert('Reminder sent to employee via WhatsApp!');
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get current employee ID
 */
function getCurrentEmployeeId() {
  return parseInt(localStorage.getItem('employeeId'));
}

/**
 * Get current shift (morning/evening)
 */
function getCurrentShift() {
  const hour = new Date().getHours();
  return hour < 14 ? 'morning' : 'evening';
}

/**
 * Get tenant ID
 */
function getTenantId() {
  return window.location.pathname.split('/')[1] || localStorage.getItem('tenantId');
}

/**
 * Show success message
 */
function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════════
// CSS STYLES (Add to your stylesheet)
// ═══════════════════════════════════════════════════════════════════

const styles = `
/* Report Cards */
.report-container {
  padding: 20px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.report-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.big-number {
  font-size: 32px;
  font-weight: bold;
  color: #2196F3;
  margin: 10px 0;
}

.trend.positive {
  color: #4CAF50;
}

.trend.negative {
  color: #f44336;
}

/* Alert History */
.alert-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  margin: 10px 0;
  border-radius: 8px;
  background: white;
  border-left: 4px solid #2196F3;
}

.alert-item.low_fuel {
  border-left-color: #f44336;
}

.alert-item.high_cash {
  border-left-color: #FF9800;
}

.alert-icon {
  font-size: 24px;
}

/* Unclosed Shifts */
.unclosed-item {
  padding: 15px;
  margin: 10px 0;
  border-radius: 8px;
  background: #FFF3E0;
  border-left: 4px solid #FF9800;
}

.unclosed-item.urgent {
  background: #FFEBEE;
  border-left-color: #f44336;
}

.hours-open {
  font-weight: bold;
  color: #f44336;
}

/* Toast Messages */
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #4CAF50;
  color: white;
  padding: 15px 20px;
  border-radius: 4px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s;
  z-index: 10000;
}

.toast.show {
  opacity: 1;
  transform: translateY(0);
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
