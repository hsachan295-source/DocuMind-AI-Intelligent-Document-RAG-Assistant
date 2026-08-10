/**
 * Hero.js — Hero Section component
 */
import { stateManager } from '../state.js';

export function createHero() {
  const section = document.createElement('section');
  section.id = 'hero';
  section.className = 'hero-section';

  section.innerHTML = `
    <div class="container">
      <div class="hero-badge">
        <span>⚡ Next-Gen RAG Intelligence</span>
      </div>

      <h1 class="hero-title">
        Transform Any PDF Document into <span class="hero-title-gradient">Instant AI Predictions & Answers</span>
      </h1>

      <p class="hero-description">
        Upload your PDF documents, contracts, reports, or research papers. Our high-performance RAG pipeline leverages Pinecone vector search and Google Gemini for hallucination-free AI answers.
      </p>

      <div class="hero-actions">
        <a href="#prediction" class="btn-primary">
          <span>🚀 Launch Prediction UI</span>
        </a>
        <a href="#dashboard" class="btn-secondary">
          <span>📊 View Results Dashboard</span>
        </a>
      </div>

      <div class="hero-stats-row">
        <div class="hero-stat-card">
          <div class="hero-stat-value" id="heroPagesVal">0</div>
          <div class="hero-stat-label">Pages Ingested</div>
        </div>
        <div class="hero-stat-card">
          <div class="hero-stat-value" id="heroChunksVal">0</div>
          <div class="hero-stat-label">Vector Chunks</div>
        </div>
        <div class="hero-stat-card">
          <div class="hero-stat-value" id="heroHistoryVal">0</div>
          <div class="hero-stat-label">Predictions Made</div>
        </div>
        <div class="hero-stat-card">
          <div class="hero-stat-value">768-D</div>
          <div class="hero-stat-label">Pinecone Embeddings</div>
        </div>
      </div>
    </div>
  `;

  // Reactive updates for hero stats
  stateManager.subscribe((state) => {
    const pagesEl = section.querySelector('#heroPagesVal');
    const chunksEl = section.querySelector('#heroChunksVal');
    const historyEl = section.querySelector('#heroHistoryVal');

    if (pagesEl) pagesEl.textContent = state.pages || 0;
    if (chunksEl) chunksEl.textContent = state.chunks || 0;
    if (historyEl) historyEl.textContent = state.history ? state.history.length : 0;
  });

  return section;
}
