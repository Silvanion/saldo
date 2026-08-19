import React, { ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, RotateCcw } from "lucide-react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
  onError?: (error: Error, errorInfo: any) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  onNavigateHome?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const BaseComponent = (React.Component || class {}) as any;

export class ErrorBoundary extends BaseComponent {
  public props!: ErrorBoundaryProps;
  public state: ErrorBoundaryState;
  public setState!: (updater: any) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
    this.props.onError?.(error, errorInfo);
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, i) => !prevProps.resetKeys || key !== (prevProps.resetKeys as any)[i]
      );
      if (hasChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  public resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  public handleReloadApp = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error || new Error("Nieznany błąd"),
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.title || "Wystąpił nieoczekiwany problem";
      const message =
        this.props.message ||
        "Nie udało się załadować tego widoku lub modułu. Twoje lokalne dane są w pełni bezpieczne.";

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center p-6 sm:p-10 text-center min-h-[280px] h-full w-full bg-surface/50 border border-border/80 rounded-2xl animate-in fade-in duration-200"
          id="error-boundary-card"
        >
          <div className="p-3 bg-danger-subtle text-danger rounded-2xl mb-4 border border-danger/20 shadow-xs">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h3 className="text-lg sm:text-xl font-black text-text-main mb-2 tracking-tight">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto mb-6 leading-relaxed">
            {message}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.resetErrorBoundary}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-text-inverse font-bold text-xs sm:text-sm rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-error-boundary-retry"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Spróbuj ponownie</span>
            </button>

            {this.props.showHomeButton && this.props.onNavigateHome && (
              <button
                type="button"
                onClick={() => {
                  this.resetErrorBoundary();
                  this.props.onNavigateHome?.();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-2 border border-border text-text-main font-bold text-xs sm:text-sm rounded-xl active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-error-boundary-home"
              >
                <Home className="w-4 h-4 text-brand" />
                <span>Wróć do Przeglądu</span>
              </button>
            )}

            <button
              type="button"
              onClick={this.handleReloadApp}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-2 border border-border text-text-muted hover:text-text-main font-bold text-xs sm:text-sm rounded-xl active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-error-boundary-reload"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Odśwież aplikację</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
