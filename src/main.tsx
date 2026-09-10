import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("B-F-L Error Caught:", error, errorInfo);
  }

  handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 text-2xl font-black border border-sky-500/30 shadow-lg">
            BFL
          </div>
          <h1 className="text-xl font-bold mb-1">B-F-L Mobile Loan Manager</h1>
          <p className="text-xs text-slate-400 mb-4 max-w-sm">
            {this.state.error?.message || 'A temporary display issue occurred. Tap below to continue.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 rounded-2xl text-xs font-black text-white shadow-lg active:scale-95 transition cursor-pointer"
            >
              Continue / Open App
            </button>
            <button
              onClick={this.handleResetSession}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-bold text-slate-300 active:scale-95 transition cursor-pointer"
            >
              Reset Session
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
