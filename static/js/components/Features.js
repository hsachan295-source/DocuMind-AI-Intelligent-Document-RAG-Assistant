/**
 * Features.js — Features Section component
 */

export function createFeatures() {
  const section = document.createElement('section');
  section.id = 'features';
  section.className = 'container';

  const featuresList = [
    {
      icon: '📑',
      title: 'Automated PDF Parsing',
      desc: 'Seamlessly ingest complex multi-page PDFs with automated text extraction, chunking, and overlap optimizations.'
    },
    {
      icon: '🧠',
      title: 'Google Gemini Embeddings',
      desc: 'Converts unstructured document text into 768-dimensional dense vector embeddings using Google Generative AI.'
    },
    {
      icon: '⚡',
      title: 'Pinecone Vector Storage',
      desc: 'Ultra-low latency vector database retrieval ensuring fast similarity search across thousands of text chunks.'
    },
    {
      icon: '🎯',
      title: 'Strict Grounded Predictions',
      desc: 'AI answers are strictly anchored to your uploaded document context to prevent hallucinations or false predictions.'
    },
    {
      icon: '📊',
      title: 'Results Dashboard',
      desc: 'Real-time monitoring of document stats, ingested page count, vector chunks, and system health status.'
    },
    {
      icon: '📜',
      title: 'Prediction History Tracker',
      desc: 'Persistent prediction history with instant search, filtering, re-queries, and CSV/JSON data export.'
    }
  ];

  section.innerHTML = `
    <div class="section-header">
      <div class="section-tag">Powerful Capabilities</div>
      <h2 class="section-title">Engineered for Document Intelligence</h2>
      <p class="section-subtitle">Discover the features empowering our high-accuracy PDF RAG Prediction system.</p>
    </div>

    <div class="features-grid">
      ${featuresList.map(f => `
        <div class="feature-card">
          <div class="feature-icon-wrapper">${f.icon}</div>
          <h3 class="feature-title">${f.title}</h3>
          <p class="feature-desc">${f.desc}</p>
        </div>
      `).join('')}
    </div>
  `;

  return section;
}
