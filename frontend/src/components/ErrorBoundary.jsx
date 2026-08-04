import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 p-8 text-center">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="max-w-sm text-sm text-neutral-500">
            An unexpected error occurred. Try reloading the page — if it keeps happening, please
            let us know what you were doing.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
