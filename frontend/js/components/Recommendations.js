/**
 * Recommendations.js — Recommendations & Prompt Insights component
 */
import { stateManager } from '../state.js';

export function createRecommendations() {
  const section = document.createElement('section');
  section.id = 'recommendations';
  section.className = 'container';

  const recommendations = [
    {
      category: '💡 Executive Summary',
      prompt: 'Summarize the core executive summary and main objectives of this document.'
    },
    {
      category: '🔍 Key Findings',
      prompt: 'What are the top 5 key findings, statistical metrics, or figures mentioned?'
    },
    {
      category: '⚠️ Risk & Constraints',
      prompt: 'Identify any limitations, risks, compliance issues, or assumptions stated.'
    },
    {
      category: '📋 Actionable Items',
      prompt: 'List all action items, recommended next steps, and timeline milestones.'
    }
  ];

  section.innerHTML = `
    <div class="section-header">
      <div class="section-tag">Smart Prompts</div>
      <h2 class="section-title">Recommended Query Templates</h2>
      <p class="section-subtitle">Click any recommendation template below to populate and run the query in the Prediction interface.</p>
    </div>

    <div class="recommendations-grid">
      ${recommendations.map(r => `
        <div class="rec-card" data-prompt="${r.prompt}">
          <div class="rec-header">${r.category}</div>
          <div class="rec-prompt">"${r.prompt}"</div>
        </div>
      `).join('')}
    </div>
  `;

  // Click event listener to populate query input and scroll to Prediction section
  section.querySelectorAll('.rec-card').forEach(card => {
    card.addEventListener('click', () => {
      const promptText = card.getAttribute('data-prompt');
      const inputEl = document.getElementById('predQuestionInput');
      const state = stateManager.get();

      if (!state.filename) {
        showToast('Please upload a PDF document first.', 'warning');
        window.location.hash = '#prediction';
        return;
      }

      if (inputEl) {
        inputEl.value = promptText;
        window.location.hash = '#prediction';
        inputEl.focus();
      }
    });
  });

  function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.remove(); }, 3500);
  }

  return section;
}
