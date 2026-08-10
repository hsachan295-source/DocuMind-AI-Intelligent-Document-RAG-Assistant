/**
 * About.js — About Section component with architecture overview
 */

export function createAbout() {
  const section = document.createElement('section');
  section.id = 'about';
  section.className = 'container';

  section.innerHTML = `
    <div class="section-header">
      <div class="section-tag">Architecture Overview</div>
      <h2 class="section-title">How the RAG Pipeline Operates</h2>
      <p class="section-subtitle">Combining retrieval-augmented generation with state-of-the-art vector similarity.</p>
    </div>

    <div class="about-card">
      <div class="about-text">
        <h3>Enterprise RAG Workflow</h3>
        <p>
          Our architecture operates by ingesting raw PDF files via FastAPI, running background document chunking, generating dense vector representations with Google Gemini, and storing vectors in a Pinecone index.
        </p>
        <p>
          When a user submits a question or prediction query, the system retrieves top matching semantic chunks and feeds them as grounded context to the Gemini LLM for precise answer synthesis.
        </p>
      </div>

      <div class="architecture-steps">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-info">
            <div class="step-title">Document Ingestion</div>
            <div class="step-sub">PyPDFLoader extracts raw pages & text content</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-info">
            <div class="step-title">Recursive Character Splitting</div>
            <div class="step-sub">Chunks document into 1,000 char blocks with 200 char overlap</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-info">
            <div class="step-title">Pinecone Vector Upsert</div>
            <div class="step-sub">Embeddings generated via embedding-001 & indexed in Pinecone</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-info">
            <div class="step-title">Grounded Answer Generation</div>
            <div class="step-sub">Gemini 1.5/3.6 answers strictly using retrieved context</div>
          </div>
        </div>
      </div>
    </div>
  `;

  return section;
}
