import {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '20px', color: 'red', fontFamily: 'sans-serif'}}>
          <h2>Something went wrong.</h2>
          <pre style={{whiteSpace: 'pre-wrap', fontSize: '12px'}}>{this.state.error?.toString()}</pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }} 
            style={{marginTop: '20px', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px'}}
          >
            Clear Data & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
