import React from "react";

interface Props {
  children?: any;
  fallback?: any;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends (React.Component as new (props: Props) => any) {
  state: State = {
    hasError: false,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center shadow-xl">
            <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>
            <p className="text-neutral-400 text-sm mb-6">
              An unexpected error occurred while loading this page.
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
