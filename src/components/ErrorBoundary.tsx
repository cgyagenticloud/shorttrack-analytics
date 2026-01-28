import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl border border-red-200 p-8 max-w-2xl w-full">
            <div className="text-4xl mb-4">💥</div>
            <h2 className="text-lg font-bold text-red-600 mb-2">Something went wrong</h2>
            <pre className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 overflow-auto max-h-60 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-4 mt-2 overflow-auto max-h-40 whitespace-pre-wrap">
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.href = '/';
              }}
              className="mt-4 px-4 py-2 bg-[#2646A7] text-white rounded-lg font-semibold text-sm hover:bg-[#0B1B61]"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
