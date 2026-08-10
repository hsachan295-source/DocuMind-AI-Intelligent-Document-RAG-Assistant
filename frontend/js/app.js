/**
 * app.js — Main application entry point & component coordinator
 */

import { createHeader } from './components/Header.js';
import { createHero } from './components/Hero.js';
import { createFeatures } from './components/Features.js';
import { createAbout } from './components/About.js';
import { createPrediction } from './components/Prediction.js';
import { createDashboard } from './components/Dashboard.js';
import { createRecommendations } from './components/Recommendations.js';
import { createHistory } from './components/History.js';
import { createFooter } from './components/Footer.js';
import { fetchStatus } from './api.js';
import { stateManager } from './state.js';

document.addEventListener('DOMContentLoaded', async () => {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  // Create Toast Container
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toastContainer';
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);

  // Mount Header Component
  const header = createHeader();
  appRoot.appendChild(header);

  // Main Content Wrapper
  const mainContent = document.createElement('main');
  mainContent.className = 'main-content';

  // Mount Sections in professional order
  mainContent.appendChild(createHero());
  mainContent.appendChild(createPrediction());
  mainContent.appendChild(createDashboard());
  mainContent.appendChild(createRecommendations());
  mainContent.appendChild(createHistory());
  mainContent.appendChild(createFeatures());
  mainContent.appendChild(createAbout());

  appRoot.appendChild(mainContent);

  // Mount Footer Component
  appRoot.appendChild(createFooter());

  // Check initial backend status on startup
  try {
    const status = await fetchStatus();
    if (status && status.status === 'ready') {
      stateManager.update({
        status: 'ready',
        filename: status.filename,
        pages: status.pages,
        chunks: status.chunks,
      });
    }
  } catch (e) {
    console.log('Backend not connected yet or standing by.');
  }
});
