/**
 * Footer.js — Footer Section component
 */

export function createFooter() {
  const footer = document.createElement('footer');
  footer.className = 'footer';

  footer.innerHTML = `
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand">
          <span style="font-size:20px;">🤖</span>
          <span>PDF RAG Assistant</span>
        </div>

        <ul class="footer-links">
          <li><a href="#hero">Home</a></li>
          <li><a href="#prediction">Prediction UI</a></li>
          <li><a href="#dashboard">Dashboard</a></li>
          <li><a href="#recommendations">Insights</a></li>
          <li><a href="#history">History</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#about">About</a></li>
        </ul>
      </div>

      <div class="footer-bottom">
        <p>© 2026 PDF RAG Assistant — Powered by Google Gemini, Pinecone & FastAPI orchestration.</p>
      </div>
    </div>
  `;

  return footer;
}
