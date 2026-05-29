import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class GlobalBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#0d1526', color: '#fff', minHeight: '100vh' }}>
          <h2 style={{ color: '#e8b130' }}>Global Render Error</h2>
          <pre style={{ color: '#f87171', whiteSpace: 'pre-wrap' }}>{this.state.error?.stack || this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalBoundary>
      <App />
    </GlobalBoundary>
  </React.StrictMode>
)
