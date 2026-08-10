/**
 * Prediction.js — Prediction & Document Q&A Component
 */
import { uploadDocument, askQuestion, fetchStatus } from '../api.js';
import { stateManager } from '../state.js';

export function createPrediction() {
  const section = document.createElement('section');
  section.id = 'prediction';
  section.className = 'container';

  section.innerHTML = `
    <div class="section-header">
      <div class="section-tag">Interactive Q&A</div>
      <h2 class="section-title">Prediction & Document Analysis</h2>
      <p class="section-subtitle">Upload your PDF document on the left and ask questions to receive AI-grounded predictions.</p>
    </div>

    <div class="prediction-layout">
      <!-- Sidebar / Upload Dropzone -->
      <div class="sidebar-panel">
        <div class="dz-title">Document Upload</div>
        
        <div class="dropzone-box" id="predDropzone">
          <div class="dz-icon">📄</div>
          <div class="dz-title">Drop your Document here</div>
          <div class="dz-sub">PDF, Word (.docx) or Text (.txt)</div>
          <button class="btn-primary" style="padding:6px 18px; font-size:12px;" id="browseBtn">Choose File</button>
          <input type="file" id="predFileInput" accept=".pdf,.docx,.doc,.txt" style="display:none;" />
        </div>

        <div class="progress-wrap" id="predProgressWrap" style="display:none;">
          <div style="display:flex; justify-content:space-between; font-size:12px;">
            <span id="predProgLabel">Uploading Document…</span>
            <span id="predProgPct">0%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="predProgFill"></div>
          </div>
        </div>

        <div class="file-card" id="predFileCard" style="display:none;">
          <div class="file-icon">📕</div>
          <div class="file-details">
            <div class="file-name" id="predFileName">Document.pdf</div>
            <div class="file-size" id="predFileMeta">0 KB</div>
          </div>
        </div>
      </div>

      <!-- Main Chat Panel -->
      <div class="chat-panel">
        <div class="chat-messages" id="chatMessages">
          <div class="chat-empty" id="chatEmpty">
            <div class="chat-empty-icon">💬</div>
            <h3 style="font-size:18px; font-weight:700;">Ask your document anything</h3>
            <p style="font-size:13px; color:var(--txt2); max-width:380px;">
              Upload a document on the left to activate AI prediction and retrieval.
            </p>
          </div>
        </div>

        <div class="chat-input-zone">
          <div class="chat-input-row">
            <textarea id="predQuestionInput" placeholder="Ask a question or request a prediction from your document…" rows="1" disabled></textarea>
            <button class="chat-send-btn" id="predSendBtn" disabled title="Send Question">➔</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Elements
  const dropzone = section.querySelector('#predDropzone');
  const fileInput = section.querySelector('#predFileInput');
  const browseBtn = section.querySelector('#browseBtn');
  const progWrap = section.querySelector('#predProgressWrap');
  const progFill = section.querySelector('#predProgFill');
  const progLabel = section.querySelector('#predProgLabel');
  const progPct = section.querySelector('#predProgPct');
  const fileCard = section.querySelector('#predFileCard');
  const fileName = section.querySelector('#predFileName');
  const fileMeta = section.querySelector('#predFileMeta');
  const chatMessages = section.querySelector('#chatMessages');
  const chatEmpty = section.querySelector('#chatEmpty');
  const qInput = section.querySelector('#predQuestionInput');
  const sendBtn = section.querySelector('#predSendBtn');

  // Event Handlers for Drag & Drop
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    const validExts = ['.pdf', '.docx', '.doc', '.txt'];
    if (file && validExts.some(ext => file.name.toLowerCase().endsWith(ext))) {
      handleUpload(file);
    } else {
      showToast('Please upload a valid PDF, Word (.docx), or Text document.', 'error');
    }
  });

  browseBtn.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('click', (e) => {
    if (e.target !== browseBtn) fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleUpload(fileInput.files[0]);
  });

  // Sync state on component load if document is already ready
  fetchStatus().then(res => {
    if (res && res.status === 'ready') {
      stateManager.update({
        status: 'ready',
        filename: res.filename,
        pages: res.pages,
        chunks: res.chunks
      });
      fileName.textContent = res.filename || 'Document';
      fileMeta.textContent = `${res.pages || 0} pages · ${res.chunks || 0} chunks`;
      fileCard.style.display = 'flex';
      qInput.disabled = false;
      sendBtn.disabled = false;
      qInput.placeholder = `Ask anything about ${res.filename || 'your document'}…`;
    }
  }).catch(() => {});

  async function handleUpload(file) {
    stateManager.update({ status: 'processing', filename: file.name, fileSize: file.size });
    
    progWrap.style.display = 'flex';
    fileCard.style.display = 'flex';
    fileName.textContent = file.name;
    fileMeta.textContent = `${(file.size / 1024).toFixed(0)} KB`;
    
    updateProgress(20, 'Uploading PDF…');

    try {
      await uploadDocument(file);
      updateProgress(60, 'Chunking & Embedding in Pinecone…');
      pollStatus(file.name, file.size);
    } catch (err) {
      stateManager.update({ status: 'error', error: err.message });
      progWrap.style.display = 'none';
      showToast(err.message || 'Upload failed', 'error');
    }
  }

  function updateProgress(pct, labelText) {
    progFill.style.width = pct + '%';
    progPct.textContent = Math.round(pct) + '%';
    if (labelText) progLabel.textContent = labelText;
  }

  let pollingInterval = null;
  function pollStatus(fname, fsize) {
    if (pollingInterval) clearInterval(pollingInterval);
    let curPct = 60;

    pollingInterval = setInterval(async () => {
      try {
        const res = await fetchStatus();
        if (res.status === 'ready') {
          clearInterval(pollingInterval);
          updateProgress(100, 'Processing Complete');
          setTimeout(() => { progWrap.style.display = 'none'; }, 1000);

          stateManager.update({
            status: 'ready',
            filename: fname,
            pages: res.pages,
            chunks: res.chunks
          });

          fileMeta.textContent = `${res.pages} pages · ${res.chunks} chunks · ${(fsize / 1024).toFixed(0)} KB`;
          qInput.disabled = false;
          sendBtn.disabled = false;
          showToast('Document ready! Ask questions now.', 'success');

        } else if (res.status === 'error') {
          clearInterval(pollingInterval);
          progWrap.style.display = 'none';
          stateManager.update({ status: 'error', error: res.error });
          showToast(res.error || 'Ingestion failed.', 'error');
        } else {
          curPct = Math.min(curPct + 5, 95);
          updateProgress(curPct, `Embedding ${res.chunks || ''} chunks…`);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 400);
  }

  // Question Submission Logic
  let lastSubmittedQuestion = '';

  // Question Submission Logic
  sendBtn.addEventListener('click', () => submitQuestion());
  qInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuestion();
    }
  });

  async function submitQuestion(overrideQuestion) {
    const q = overrideQuestion || qInput.value.trim();
    const currentState = stateManager.get();
    if (!q || currentState.isBusy || currentState.status !== 'ready') return;

    lastSubmittedQuestion = q;
    if (chatEmpty) chatEmpty.style.display = 'none';

    if (!overrideQuestion) {
      appendUserMessage(q);
      qInput.value = '';
    }

    stateManager.update({ isBusy: true });
    qInput.disabled = true;
    sendBtn.disabled = true;

    const typingEl = appendTypingIndicator();

    try {
      const res = await askQuestion(q);
      typingEl.remove();
      appendAiResponseCard(res.answer, res.filename || currentState.filename, res.sources || []);
      stateManager.addHistoryRecord(q, res.answer);
    } catch (err) {
      typingEl.remove();
      appendAiResponseCard('Error generating response: ' + (err.message || 'Server error'), currentState.filename, []);
    } finally {
      stateManager.update({ isBusy: false });
      qInput.disabled = false;
      sendBtn.disabled = false;
      qInput.focus();
    }
  }

  function appendUserMessage(text) {
    const row = document.createElement('div');
    row.className = 'msg-row user';
    
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '🧑';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendAiResponseCard(answerText, filename, sources) {
    const row = document.createElement('div');
    row.className = 'msg-row ai';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '🤖';

    const card = document.createElement('div');
    card.className = 'ai-response-card';

    // 1. Header
    const header = document.createElement('div');
    header.className = 'ai-card-header';
    header.innerHTML = `<span class="ai-badge">🤖 AI Assistant</span>`;

    // 2. Body (Markdown rendered)
    const body = document.createElement('div');
    body.className = 'ai-card-body markdown-content';
    body.innerHTML = parseMarkdown(answerText);

    card.appendChild(header);
    card.appendChild(body);

    // 3. Sources Section (if metadata is available)
    if (sources && sources.length > 0) {
      const sourcesSec = document.createElement('div');
      sourcesSec.className = 'ai-card-sources';
      
      let sourceItemsHtml = '';
      const docName = filename || 'Document';
      
      const seen = new Set();
      sources.forEach((s) => {
        const pageLabel = (s.page !== null && s.page !== undefined && s.page !== '?') ? `Page ${typeof s.page === 'number' ? Math.floor(s.page) + 1 : s.page}` : '';
        const chunkLabel = s.chunk ? `Chunk ${s.chunk}` : '';
        const key = `${pageLabel}-${chunkLabel}`;
        if (!seen.has(key)) {
          seen.add(key);
          const metaStr = [pageLabel, chunkLabel].filter(Boolean).join(' · ') || 'Relevant Section';
          sourceItemsHtml += `
            <div class="source-item">
              <div class="source-left">
                <span class="source-doc-icon">📄</span>
                <div class="source-info">
                  <div class="source-filename">${escapeHtml(docName)}</div>
                  <div class="source-meta">${metaStr}</div>
                </div>
              </div>
              <button class="source-view-btn" onclick="alert('Viewing source context for ${escapeHtml(docName)}')">View Source</button>
            </div>
          `;
        }
      });

      if (sourceItemsHtml) {
        sourcesSec.innerHTML = `
          <div class="sources-title">📚 Sources</div>
          <div class="source-items">${sourceItemsHtml}</div>
        `;
        card.appendChild(sourcesSec);
      }
    }

    // 4. Action Bar
    const actionsBar = document.createElement('div');
    actionsBar.className = 'ai-card-actions';

    // Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.innerHTML = '<span class="btn-icon">📋</span> Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(answerText).then(() => {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
        showToast('Response copied to clipboard', 'info');
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = '<span class="btn-icon">📋</span> Copy';
        }, 2000);
      });
    });

    // Regenerate Button
    const regenBtn = document.createElement('button');
    regenBtn.className = 'action-btn';
    regenBtn.innerHTML = '<span class="btn-icon">🔄</span> Regenerate';
    regenBtn.addEventListener('click', () => {
      if (lastSubmittedQuestion) {
        submitQuestion(lastSubmittedQuestion);
      }
    });

    // Thumbs Up Button
    const thumbsUpBtn = document.createElement('button');
    thumbsUpBtn.className = 'action-btn';
    thumbsUpBtn.innerHTML = '<span class="btn-icon">👍</span> Helpful';
    thumbsUpBtn.addEventListener('click', () => {
      thumbsUpBtn.classList.toggle('active');
      thumbsDownBtn.classList.remove('active');
      showToast('Thanks for your feedback!', 'success');
    });

    // Thumbs Down Button
    const thumbsDownBtn = document.createElement('button');
    thumbsDownBtn.className = 'action-btn';
    thumbsDownBtn.innerHTML = '<span class="btn-icon">👎</span> Not Helpful';
    thumbsDownBtn.addEventListener('click', () => {
      thumbsDownBtn.classList.toggle('active');
      thumbsUpBtn.classList.remove('active');
      showToast('Feedback noted. We will improve!', 'info');
    });

    actionsBar.appendChild(copyBtn);
    actionsBar.appendChild(regenBtn);
    actionsBar.appendChild(thumbsUpBtn);
    actionsBar.appendChild(thumbsDownBtn);

    card.appendChild(actionsBar);

    row.appendChild(avatar);
    row.appendChild(card);
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'msg-row ai';
    
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '🤖';

    const card = document.createElement('div');
    card.className = 'ai-response-card';
    card.innerHTML = `
      <div class="ai-card-header"><span class="ai-badge">🤖 AI Assistant</span></div>
      <div class="ai-card-body" style="opacity:0.7; font-style:italic;">
        Analyzing document context and structuring answer...
      </div>
    `;

    row.appendChild(avatar);
    row.appendChild(card);
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return row;
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseMarkdown(text) {
    if (!text) return '';
    if (window.marked && typeof window.marked.parse === 'function') {
      try {
        return window.marked.parse(text);
      } catch (e) {
        console.warn('Marked error:', e);
      }
    }
    
    // Fallback parser
    let html = escapeHtml(text);
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^---$/gim, '<hr class="section-divider">');

    const lines = html.split('\n');
    let inList = false;
    let listType = '';
    let result = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) { inList = true; listType = 'ul'; result.push('<ul>'); }
        result.push(`<li>${trimmed.substring(2)}</li>`);
      } else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList) { inList = true; listType = 'ol'; result.push('<ol>'); }
        result.push(`<li>${trimmed.replace(/^\d+\.\s/, '')}</li>`);
      } else {
        if (inList) { inList = false; result.push(`</${listType}>`); }
        if (trimmed && !trimmed.startsWith('<h') && !trimmed.startsWith('<hr')) {
          result.push(`<p>${line}</p>`);
        } else {
          result.push(line);
        }
      }
    });

    if (inList) { result.push(`</${listType}>`); }
    return result.join('\n');
  }

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
