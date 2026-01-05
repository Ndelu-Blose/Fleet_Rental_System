type LogLevel = "error" | "warn" | "info" | "debug"

interface LogContext {
  userId?: string
  email?: string
  role?: string
  ip?: string
  userAgent?: string
  path?: string
  method?: string
  [key: string]: unknown
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ""
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error
    const fullContext = { ...context, error: errorDetails }
    console.error(this.formatMessage("error", message, fullContext))
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage("warn", message, context))
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatMessage("info", message, context))
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage("debug", message, context))
    }
  }
}

export const logger = new Logger()

// Helper to extract request context from NextRequest
export function getRequestContext(req: Request): LogContext {
  const url = new URL(req.url)
  return {
    path: url.pathname,
    method: req.method,
    ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
  }
}

