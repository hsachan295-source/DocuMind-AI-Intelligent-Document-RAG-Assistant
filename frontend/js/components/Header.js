/**
 * Header.js — Header & Navigation Bar component with real-time status pill
 */
import { stateManager } from '../state.js';

export function createHeader() {
  const header = document.createElement('header');
  header.className = 'navbar';

  header.innerHTML = `
    <div class="container navbar-container">
      <a href="#hero" class="nav-brand">
        <div class="brand-icon">🤖</div>
        <div>
          <div class="brand-title">PDF RAG Assistant</div>
          <div class="brand-subtitle">Gemini · Pinecone · LangChain</div>
        </div>
      </a>

      <ul class="nav-links">
        <li><a href="#hero" class="nav-link">Home</a></li>
        <li><a href="#prediction" class="nav-link">Prediction UI</a></li>
        <li><a href="#dashboard" class="nav-link">Dashboard</a></li>
        <li><a href="#recommendations" class="nav-link">Insights</a></li>
        <li><a href="#history" class="nav-link">History</a></li>
        <li><a href="#features" class="nav-link">Features</a></li>
        <li><a href="#about" class="nav-link">About</a></li>
      </ul>

      <div class="nav-status-pill" id="navStatusPill">
        <div class="led"></div>
        <span id="navStatusText">No document loaded</span>
      </div>
    </div>
  `;

  // Subscribe to state changes for real-time status updates
  stateManager.subscribe((state) => {
    const pill = header.querySelector('#navStatusPill');
    const txt = header.querySelector('#navStatusText');

    if (!pill || !txt) return;

    if (state.status === 'ready') {
      pill.className = 'nav-status-pill ready';
      txt.textContent = state.filename ? `Ready: ${state.filename}` : 'Ready';
    } else if (state.status === 'processing') {
      pill.className = 'nav-status-pill processing';
      txt.textContent = 'Ingesting document…';
    } else if (state.status === 'error') {
      pill.className = 'nav-status-pill error';
      txt.textContent = 'Ingestion Error';
    } else {
      pill.className = 'nav-status-pill';
      txt.textContent = 'No document loaded';
    }
  });

  return header;
}
