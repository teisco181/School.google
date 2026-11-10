import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Root Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#0f172a',
          color: '#f8fafc',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            background: '#1e293b',
            padding: '32px',
            borderRadius: '24px',
            border: '1px solid #334155',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
              Applicatie kon niet direct starten
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.6' }}>
              Er trad een onverwachte runtime-fout op. Dit gebeurt soms bij het laden via GitHub Pages of wanneer lokale opslag geblokkeerd is.
            </p>
            {this.state.error && (
              <pre style={{
                background: '#090d16',
                color: '#f87171',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '11px',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '20px',
                border: '1px solid #7f1d1d'
              }}>
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  padding: '10px 18px',
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cache herstellen & Herladen
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 18px',
                  background: '#334155',
                  color: '#f8fafc',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Opnieuw proberen
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
