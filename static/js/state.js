/**
 * state.js — Reactive application state management & history persistence
 */

const HISTORY_KEY = 'rag_prediction_history';

// Load stored prediction history from localStorage
function loadStoredHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load stored history:', e);
    return [];
  }
}

class AppState {
  constructor() {
    this.state = {
      status: 'idle', // idle | processing | ready | error
      filename: null,
      fileSize: 0,
      pages: 0,
      chunks: 0,
      error: null,
      isBusy: false,
      messages: [],
      history: loadStoredHistory(),
    };
    this.listeners = new Set();
  }

  get() {
    return this.state;
  }

  update(partialState) {
    this.state = { ...this.state, ...partialState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Initial call
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // History Management
  addHistoryRecord(question, answer) {
    const record = {
      id: 'pred_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      filename: this.state.filename || 'Document',
      question,
      answer,
      pages: this.state.pages,
      chunks: this.state.chunks,
    };

    const updatedHistory = [record, ...this.state.history];
    this.update({ history: updatedHistory });
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to persist history:', e);
    }
  }

  clearHistory() {
    this.update({ history: [] });
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }
}

export const stateManager = new AppState();
