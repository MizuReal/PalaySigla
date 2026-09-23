// Root error fallback — rendered by the app-level ErrorBoundary when a render
// throws. Diagnostics are logged by the boundary; the UI only ever shows the
// friendly copy and a "Try again" that resets the boundary.
import type { FallbackProps } from 'react-error-boundary'
import Button from './Button'
import FullPageMessage from './FullPageMessage'

function RootErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <FullPageMessage
      tone="error"
      icon="info"
      title="Something went wrong."
      message="An unexpected problem occurred. Try again — the app will restart this screen."
    >
      <Button label="Try again" onPress={resetErrorBoundary} fullWidth />
    </FullPageMessage>
  )
}

export default RootErrorFallback
