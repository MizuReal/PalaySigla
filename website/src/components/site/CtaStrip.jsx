import { useState } from 'react'
import Button from '../Button.jsx'
import Container from '../Container.jsx'
import Icon from '../Icon.jsx'
import { EMAIL_PATTERN } from '../../utils/validation.js'

function EarlyAccessForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setEmail('')
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="flex items-start gap-3 border border-primary bg-surface-soft p-6">
        <Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="body-strong text-ink">You&rsquo;re on the list.</p>
          <p className="body-sm mt-1 text-mute">
            We&rsquo;ll email you when PalaySigla launches. Ingat!
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="early-access-email" className="sr-only">
          Email address
        </label>
        <input
          id="early-access-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@sakahan.ph"
          className="h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]"
        />
        <Button type="submit" className="shrink-0">
          Notify me
        </Button>
      </div>
      {error && (
        <p className="caption-sm mt-2 text-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

function CtaStrip() {
  return (
    <section id="cta" className="scroll-mt-16 border-t border-hairline bg-surface-soft">
      <Container className="flex flex-col gap-10 py-16 md:py-[80px] lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="caption-md text-primary">Early access</p>
          <h2 className="heading-xl mt-3 text-ink">
            Be first in line at launch.
          </h2>
          <p className="body-md mt-4 text-body">
            Sign up now and we&rsquo;ll notify you the moment PalaySigla is
            ready for rice mills and farmers. No cost, no commitment.
          </p>
        </div>
        <EarlyAccessForm />
      </Container>
    </section>
  )
}

export default CtaStrip
