import { Link } from 'react-router-dom'
import {
  LEGAL_INLINE_LINK_CLASS,
  LegalPage,
  LegalSection,
} from '../components/site/LegalPage'

const LAST_UPDATED = 'November 14, 2026'

const CONTACT_EMAIL = 'PalaySigla@gmail.com'

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalSection title="Acceptance of these terms">
        <p className="body-md text-body">
          By creating an account or using PalaySigla, you agree to these Terms of
          Service and our{' '}
          <Link to="/privacy" className={LEGAL_INLINE_LINK_CLASS}>
            Privacy Policy
          </Link>
          . If you do not agree, do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="The service">
        <p className="body-md text-body">
          PalaySigla provides image-based paddy quality monitoring, including
          quality status, mold detection, market grade, and variety classification,
          together with marketplace, forum, messaging, and assistant features. We
          may change, suspend, or discontinue parts of the service as it develops.
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p className="body-md text-body">
          You must provide accurate account information, keep your password
          confidential, and use the service only for lawful purposes. You are
          responsible for activity that occurs under your account. You must be at
          least 13 years old to use PalaySigla.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p className="body-md text-body">
          You retain ownership of the photos, listings, posts, messages, and other
          content you submit. You grant us a limited license to host, store,
          process, and display that content as needed to operate the service. You
          are responsible for ensuring that your content does not infringe the
          rights of others or violate the law.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p className="body-md text-body">
          You may not use PalaySigla to post false or misleading listings, harass
          others, upload malicious files, attempt to access accounts or systems
          without permission, scrape the service at scale, reverse engineer the
          models, or interfere with the service’s normal operation.
        </p>
      </LegalSection>

      <LegalSection title="Assessments and AI results">
        <p className="body-md text-body">
          Quality, mold, grade, variety, and assistant outputs are advisory and may
          be inaccurate or incomplete. A result marked for review is not a
          confirmation of quality or safety. Do not rely solely on PalaySigla for
          pricing, food-safety, storage, or other important decisions.
        </p>
      </LegalSection>

      <LegalSection title="Marketplace">
        <p className="body-md text-body">
          PalaySigla provides a venue for buyers and sellers to connect. We are not
          a party to transactions, do not guarantee payment, delivery, quality, or
          the accuracy of listings, and do not mediate disputes. Verify the identity
          and terms of the other party before transacting.
        </p>
      </LegalSection>

      <LegalSection title="Forum and messages">
        <p className="body-md text-body">
          Posts, comments, and messages may be visible to other users. Do not share
          sensitive personal information you do not want others to see. We may
          remove content or restrict accounts that violate these terms.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p className="body-md text-body">
          The PalaySigla name, interface, software, and models are owned by us or
          our licensors. These terms do not grant you ownership of the service or
          permission to copy, redistribute, or commercially exploit it.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p className="body-md text-body">
          The service relies on third-party providers for authentication, hosting,
          maps, messaging, and email delivery. Their services may be subject to
          their own terms and may be unavailable from time to time.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p className="body-md text-body">
          You may stop using PalaySigla at any time. We may suspend or terminate
          access if you violate these terms, if required by law, or if needed to
          protect the service or other users.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers and limitation of liability">
        <p className="body-md text-body">
          The service is provided “as is” and “as available” without warranties of
          any kind, to the maximum extent permitted by law. We are not liable for
          indirect, incidental, special, consequential, or punitive damages, or for
          lost profits, data, or goodwill arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p className="body-md text-body">
          We may update these terms as the service changes. The latest version will
          be posted on this page with a new “Last updated” date. Continued use after
          an update means you accept the revised terms.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p className="body-md text-body">
          These terms are governed by the laws of the Republic of the Philippines,
          without regard to conflict-of-law rules.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p className="body-md text-body">
          For questions about these terms, contact{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LEGAL_INLINE_LINK_CLASS}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}

export default TermsPage
