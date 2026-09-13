import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class CoreErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CornetCore] unrecoverable core error", error, info);
  }

  private retry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
        <section className="max-w-lg text-center" role="alert">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cornet</p>
          <h1 className="mt-3 text-2xl font-bold text-foreground">El núcleo de Cornet encontró un problema</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            La interfaz principal se aisló para evitar que un fallo secundario deje toda la aplicación en blanco.
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Intentar de nuevo
          </button>
          {this.state.error?.message && (
            <pre className="mt-6 overflow-auto rounded-xl border border-border bg-card p-4 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
        </section>
      </main>
    );
  }
}
