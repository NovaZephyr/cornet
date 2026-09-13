import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

type ShellErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
};

type ShellErrorBoundaryState = {
  hasError: boolean;
};

export class ShellErrorBoundary extends Component<
  ShellErrorBoundaryProps,
  ShellErrorBoundaryState
> {
  override state: ShellErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ShellErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ShellErrorBoundary] ${this.props.label ?? "Shell section"}`, error, info);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      this.props.fallback ?? (
        <div role="status" className="cn-shell-error-fallback">
          No se pudo cargar esta sección.
        </div>
      )
    );
  }
}
