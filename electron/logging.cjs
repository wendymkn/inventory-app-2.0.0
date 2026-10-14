const fs = require("fs");
const path = require("path");

const MAX_LOG_BYTES =
  2 * 1024 * 1024;

const KEEP_LOG_BYTES =
  1024 * 1024;

function safeText(
  value,
  maxLength = 6000
) {
  const result =
    String(
      value ?? ""
    );

  return result.length >
    maxLength
    ? `${result.slice(
        0,
        maxLength
      )}\n...[truncated]`
    : result;
}

function serializeError(
  error
) {
  if (!error) {
    return {
      message:
        "Unknown error",
      stack: "",
    };
  }

  if (
    error instanceof Error
  ) {
    return {
      name:
        error.name,

      message:
        safeText(
          error.message
        ),

      stack:
        safeText(
          error.stack ||
          ""
        ),
    };
  }

  if (
    typeof error ===
      "object"
  ) {
    try {
      return {
        message:
          safeText(
            JSON.stringify(
              error
            )
          ),
        stack: "",
      };
    } catch {
      // Fall through.
    }
  }

  return {
    message:
      safeText(error),
    stack: "",
  };
}

function createLogger(
  userDataPath
) {
  const logDirectory =
    path.join(
      userDataPath,
      "logs"
    );

  const mainLogPath =
    path.join(
      logDirectory,
      "main.log"
    );

  const errorLogPath =
    path.join(
      logDirectory,
      "errors.log"
    );

  fs.mkdirSync(
    logDirectory,
    {
      recursive: true,
    }
  );

  function rotateIfNeeded(
    filePath
  ) {
    try {
      if (
        !fs.existsSync(
          filePath
        )
      ) {
        return;
      }

      const stat =
        fs.statSync(
          filePath
        );

      if (
        stat.size <=
        MAX_LOG_BYTES
      ) {
        return;
      }

      const bytes =
        fs.readFileSync(
          filePath
        );

      const start =
        Math.max(
          0,
          bytes.length -
          KEEP_LOG_BYTES
        );

      fs.writeFileSync(
        filePath,
        bytes.subarray(
          start
        )
      );
    } catch {
      // Logging must never crash GlamStock.
    }
  }

  function append(
    filePath,
    level,
    message,
    details = null
  ) {
    try {
      rotateIfNeeded(
        filePath
      );

      const entry = {
        timestamp:
          new Date()
            .toISOString(),

        level,

        message:
          safeText(
            message,
            2000
          ),
      };

      if (
        details !== null &&
        details !== undefined
      ) {
        entry.details =
          details;
      }

      fs.appendFileSync(
        filePath,
        `${JSON.stringify(
          entry
        )}\n`,
        "utf8"
      );
    } catch {
      // Never allow logging to become the app failure.
    }
  }

  function info(
    message,
    details = null
  ) {
    append(
      mainLogPath,
      "info",
      message,
      details
    );
  }

  function warn(
    message,
    details = null
  ) {
    append(
      mainLogPath,
      "warn",
      message,
      details
    );
  }

  function error(
    message,
    errorValue = null,
    details = null
  ) {
    const serialized =
      serializeError(
        errorValue
      );

    const combined = {
      error:
        serialized,

      details:
        details || null,
    };

    append(
      mainLogPath,
      "error",
      message,
      combined
    );

    append(
      errorLogPath,
      "error",
      message,
      combined
    );
  }

  function renderer(
    payload
  ) {
    const safePayload = {
      type:
        safeText(
          payload?.type ||
          "renderer",
          100
        ),

      message:
        safeText(
          payload?.message ||
          "Renderer error",
          2000
        ),

      stack:
        safeText(
          payload?.stack ||
          "",
          6000
        ),

      source:
        safeText(
          payload?.source ||
          "",
          1000
        ),

      line:
        Number(
          payload?.line
        ) || null,

      column:
        Number(
          payload?.column
        ) || null,
    };

    error(
      "Renderer error",
      safePayload.message,
      safePayload
    );
  }

  function readRecent(
    filePath,
    maxLines = 100
  ) {
    try {
      if (
        !fs.existsSync(
          filePath
        )
      ) {
        return [];
      }

      const content =
        fs.readFileSync(
          filePath,
          "utf8"
        );

      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(
          -Math.max(
            1,
            Math.min(
              maxLines,
              500
            )
          )
        );
    } catch {
      return [];
    }
  }

  function getRecentErrors(
    maxLines = 80
  ) {
    return readRecent(
      errorLogPath,
      maxLines
    );
  }

  function getInfo() {
    return {
      logDirectory,
      mainLogPath,
      errorLogPath,
    };
  }

  return {
    info,
    warn,
    error,
    renderer,
    getRecentErrors,
    getInfo,
  };
}

module.exports = {
  createLogger,
};
