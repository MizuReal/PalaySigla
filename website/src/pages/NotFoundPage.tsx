import Button from '../components/Button'
import FullPageMessage from '../components/site/FullPageMessage'

function NotFoundPage() {
  return (
    <FullPageMessage
      title="Page not found."
      message="That address doesn't lead anywhere on PalaySigla. Check the link, or jump to a page that does."
      actions={
        <>
          <Button to="/marketplace">Go to Marketplace</Button>
          <Button variant="outline" to="/">
            Back to home
          </Button>
        </>
      }
    />
  )
}

export default NotFoundPage
