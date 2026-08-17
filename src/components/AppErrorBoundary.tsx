import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorScreen } from './ErrorScreen'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  error: Error | null
}

/**
 * Last-resort safety net at the app root. Route-level errors are normally
 * caught first by each route's errorElement (see RouteErrorFallback) - React
 * Router's data router intercepts render errors within a route's own
 * element tree before they can reach an ancestor boundary like this one.
 * This exists for whatever that doesn't cover (e.g. a throw during
 * RouterProvider's own render), so the user never sees a raw stack dump.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CBDG crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen error={this.state.error} />
    }
    return this.props.children
  }
}
