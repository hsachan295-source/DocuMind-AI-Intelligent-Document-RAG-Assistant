/**
 * History.js — Prediction History Section component with search, filter, and export
 */
import { stateManager } from '../state.js';

export function createHistory() {
  const section = document.createElement('section');
  section.id = 'history';
  section.className = 'container';

  section.innerHTML = `
    <div class="section-header">
      <div class="section-tag">Audit & Persistence</div>
      <h2 class="section-title">Prediction History</h2>
      <p class="section-subtitle">Track and review past document predictions, search queries, and export audit reports.</p>
    </div>

    <div class="history-panel">
      <div class="history-toolbar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="historySearchInput" placeholder="Search past questions or answers…" />
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" style="padding:6px 14px; font-size:12px;" id="exportJsonBtn">📥 Export JSON</button>
          <button class="btn-secondary" style="padding:6px 14px; font-size:12px;" id="exportCsvBtn">📊 Export CSV</button>
          <button class="btn-secondary" style="padding:6px 14px; font-size:12px; color:var(--error);" id="clearHistoryBtn">🗑️ Clear</button>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Document</th>
              <th>Question</th>
              <th>Answer Preview</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="historyTableBody">
            <tr>
              <td colspan="5" style="text-align:center; color:var(--txt3); padding:24px;">
                No prediction history recorded yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = section.querySelector('#historyTableBody');
  const searchInput = section.querySelector('#historySearchInput');
  const clearBtn = section.querySelector('#clearHistoryBtn');
  const exportJsonBtn = section.querySelector('#exportJsonBtn');
  const exportCsvBtn = section.querySelector('#exportCsvBtn');

  // Render History Table Rows
  function renderHistory(filterText = '') {
    const state = stateManager.get();
    let records = state.history || [];

    if (filterText) {
      const query = filterText.toLowerCase();
      records = records.filter(r => 
        r.question.toLowerCase().includes(query) ||
        r.answer.toLowerCase().includes(query) ||
        r.filename.toLowerCase().includes(query)
      );
    }

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:var(--txt3); padding:24px;">
            ${filterText ? 'No matching predictions found.' : 'No prediction history recorded yet.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map(r => `
      <tr>
        <td style="white-space:nowrap; color:var(--txt2);">${r.timestamp}</td>
        <td style="font-weight:600; color:var(--primary);">${r.filename}</td>
        <td style="max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(r.question)}</td>
        <td style="max-width:320px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--txt2);">${escapeHtml(r.answer)}</td>
        <td>
          <button class="btn-secondary view-detail-btn" data-id="${r.id}" style="padding:4px 10px; font-size:11px;">View</button>
        </td>
      </tr>
    `).join('');

    // Attach click listener for detail viewing
    tbody.querySelectorAll('.view-detail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const record = records.find(item => item.id === id);
        if (record) {
          alert(`Question:\n${record.question}\n\nAnswer:\n${record.answer}`);
        }
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Subscribe to state manager
  stateManager.subscribe(() => renderHistory(searchInput.value));

  // Search filter listener
  searchInput.addEventListener('input', () => renderHistory(searchInput.value));

  // Clear history handler
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all prediction history?')) {
      stateManager.clearHistory();
    }
  });

  // Export JSON handler
  exportJsonBtn.addEventListener('click', () => {
    const history = stateManager.get().history || [];
    if (history.length === 0) { alert('History is empty!'); return; }

    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediction_history_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Export CSV handler
  exportCsvBtn.addEventListener('click', () => {
    const history = stateManager.get().history || [];
    if (history.length === 0) { alert('History is empty!'); return; }

    let csv = 'Timestamp,Document,Question,Answer\n';
    history.forEach(r => {
      const q = `"${r.question.replace(/"/g, '""')}"`;
      const a = `"${r.answer.replace(/"/g, '""')}"`;
      csv += `${r.timestamp},${r.filename},${q},${a}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prediction_history_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  return section;
}
