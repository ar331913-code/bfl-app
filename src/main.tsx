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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 text-2xl font-black">
            BFL
          </div>
          <h1 className="text-xl font-bold mb-2">B-F-L Mobile Loan Manager</h1>
          <p className="text-xs text-slate-400 mb-6 max-w-xs">
            The application encountered a reloadable state.
          </p>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl text-xs font-bold text-white shadow-lg active:scale-95 transition"
          >
            Reload Application
          </button>
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
