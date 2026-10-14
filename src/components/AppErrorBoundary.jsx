import React from "react";

class AppErrorBoundary
  extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      message: "",
    };
  }

  static getDerivedStateFromError(
    error
  ) {
    return {
      hasError: true,
      message:
        error?.message ||
        "Unexpected application error.",
    };
  }

  componentDidCatch(
    error,
    info
  ) {
    try {
      window.glamstock
        ?.diagnostics
        ?.logRenderer?.({
          type:
            "react-boundary",

          message:
            error?.message ||
            "React render error",

          stack:
            `${error?.stack || ""}\n${info?.componentStack || ""}`,
        });
    } catch {
      // Never throw from the error boundary.
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (
      this.state
        .hasError
    ) {
      return (
        <div
          className="page-shell"
          style={{
            minHeight:
              "100vh",
            display:
              "grid",
            placeItems:
              "center",
            padding: 24,
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: 600,
              width: "100%",
            }}
          >
            <h1>
              Something went wrong
            </h1>

            <p>
              GlamStock encountered an application error. Your database has not been intentionally deleted or reset.
            </p>

            <div
              className="inline-info"
              style={{
                margin:
                  "16px 0",
              }}
            >
              {this.state
                .message}
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={
                this.handleReload
              }
            >
              Reload GlamStock
            </button>
          </div>
        </div>
      );
    }

    return this.props
      .children;
  }
}

export default AppErrorBoundary;
