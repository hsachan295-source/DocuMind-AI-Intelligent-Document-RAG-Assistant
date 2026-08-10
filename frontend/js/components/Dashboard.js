/**
 * Dashboard.js — Dashboard & Results Section component
 */
import { stateManager } from '../state.js';

export function createDashboard() {
  const section = document.createElement('section');
  section.id = 'dashboard';
  section.className = 'container';

  section.innerHTML = `
    <div class="section-header">
      <div class="section-tag">Real-Time Metrics</div>
      <h2 class="section-title">Dashboard & Results Center</h2>
      <p class="section-subtitle">Comprehensive operational metrics, ingestion stats, and vector performance analytics.</p>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-card">
        <div class="dash-icon">📖</div>
        <div>
          <div class="dash-val" id="dashPages">0</div>
          <div class="dash-lbl">Pages Processed</div>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="dash-icon">🧩</div>
        <div>
          <div class="dash-val" id="dashChunks">0</div>
          <div class="dash-lbl">Vector Chunks</div>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="dash-icon">🎯</div>
        <div>
          <div class="dash-val" id="dashPredictions">0</div>
          <div class="dash-lbl">Total Queries</div>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="dash-icon">🌲</div>
        <div>
          <div class="dash-val">Pinecone</div>
          <div class="dash-lbl">Vector Store Status</div>
        </div>
      </div>
    </div>

    <!-- Active Document Specs Panel -->
    <div class="history-panel" style="margin-top: 10px;">
      <h3 style="font-size:16px; font-weight:700; margin-bottom:14px; color:#fff;">
        Active Document Analytics
      </h3>
      
      <table class="history-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Loaded File Name</td>
            <td id="tableFileName">None</td>
            <td><span style="color:var(--txt3);" id="tableFileStatus">Idle</span></td>
          </tr>
          <tr>
            <td>Embedding Model</td>
            <td>Google Gemini models/embedding-001</td>
            <td><span style="color:var(--success);">Active</span></td>
          </tr>
          <tr>
            <td>Vector Database Index</td>
            <td>Pinecone (768-D Cosine Similarity)</td>
            <td><span style="color:var(--success);">Connected</span></td>
          </tr>
          <tr>
            <td>Text Chunk Size / Overlap</td>
            <td>1,000 chars / 200 chars</td>
            <td><span style="color:var(--info);">Configured</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Subscribe to state to keep dashboard metrics updated
  stateManager.subscribe((state) => {
    const pages = section.querySelector('#dashPages');
    const chunks = section.querySelector('#dashChunks');
    const predictions = section.querySelector('#dashPredictions');
    const tableFileName = section.querySelector('#tableFileName');
    const tableFileStatus = section.querySelector('#tableFileStatus');

    if (pages) pages.textContent = state.pages || 0;
    if (chunks) chunks.textContent = state.chunks || 0;
    if (predictions) predictions.textContent = state.history ? state.history.length : 0;
    if (tableFileName) tableFileName.textContent = state.filename || 'No file loaded';
    if (tableFileStatus) {
      tableFileStatus.textContent = state.status.toUpperCase();
      tableFileStatus.style.color = state.status === 'ready' ? 'var(--success)' : state.status === 'processing' ? 'var(--warning)' : 'var(--txt3)';
    }
  });

  return section;
}
