import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import Button from '../components/Button.jsx'
import FullPageMessage from '../components/site/FullPageMessage.jsx'

function RouteErrorPage() {
  const error = useRouteError()

  // diagnostics belong in the console; the UI never leaks internal error details
  useEffect(() => {
    console.error('Unhandled route error:', error)
  }, [error])

  return (
    <FullPageMessage
      tone="error"
      icon="info"
      title="Something went wrong."
      message="An unexpected problem occurred while loading this page. Try again — or head back home and start over."
      actions={
        <>
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="outline" to="/">
            Back to home
          </Button>
        </>
      }
    />
  )
}

export default RouteErrorPage
