/**
 * api.js — Service module for backend communication with FastAPI
 */

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to upload document.');
  }

  return await response.json();
}

export async function askQuestion(question) {
  const response = await fetch('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to generate answer.');
  }

  return await response.json();
}

export async function fetchStatus() {
  const response = await fetch('/status');
  if (!response.ok) {
    throw new Error('Failed to fetch status.');
  }
  return await response.json();
}
