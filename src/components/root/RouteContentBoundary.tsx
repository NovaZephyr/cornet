import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class RouteContentBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RouteContentBoundary] route content failed", error, info);
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-[50vh] items-center justify-center bg-background px-4 py-16">
        <section className="max-w-md text-center" role="alert">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">No pudimos cargar esta sección</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Esta parte de Cornet encontró un problema, pero el resto de la aplicación sigue disponible.
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Intentar de nuevo
          </button>
        </section>
      </main>
    );
  }
}
