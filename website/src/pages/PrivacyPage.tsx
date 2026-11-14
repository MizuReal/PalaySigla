import {
  LEGAL_INLINE_LINK_CLASS,
  LegalPage,
  LegalSection,
} from '../components/site/LegalPage'

const LAST_UPDATED = 'November 14, 2026'

const CONTACT_EMAIL = 'PalaySigla@gmail.com'

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="Who we are">
        <p className="body-md text-body">
          PalaySigla is an image-based paddy quality monitoring service for rice
          mills, farmers, and buyers in the Philippines. This policy explains what
          we collect, why we collect it, how we use it, and the choices you have.
          Questions or requests can be sent to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LEGAL_INLINE_LINK_CLASS}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <p className="body-md text-body">
          We collect information you provide directly, information generated when
          you use the service, and limited technical information from our hosting
          providers:
        </p>
        <ul className="list-disc space-y-2 pl-5 body-md text-body">
          <li>
            <span className="body-strong text-ink">Account and profile:</span>{' '}
            name, email address, password (stored as a hash by our authentication
            provider), profile details, and farmer verification documents you
            choose to upload.
          </li>
          <li>
            <span className="body-strong text-ink">Images and assessments:</span>{' '}
            paddy photos, scanned sheets, and the resulting quality status, mold
            detection, market grade, variety classification, and confidence scores.
          </li>
          <li>
            <span className="body-strong text-ink">
              Marketplace, forum, and messages:
            </span>{' '}
            listings, posts, comments, messages, reviews, and related transaction
            details you choose to share.
          </li>
          <li>
            <span className="body-strong text-ink">Location:</span> coordinates or
            place names used for marketplace listings, maps, and geocoding.
          </li>
          <li>
            <span className="body-strong text-ink">Technical information:</span>{' '}
            IP address, device and browser type, request logs, and browser storage
            used for your session, assistant chat history, and interface
            preferences.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use information">
        <p className="body-md text-body">
          We use information to operate and improve PalaySigla, run quality and
          defect assessments, provide the marketplace, forum, messaging, and
          assistant features, verify accounts, prevent abuse, enforce rate limits,
          provide support, and comply with legal obligations. We do not sell
          personal information.
        </p>
      </LegalSection>

      <LegalSection title="Google Gmail API">
        <p className="body-md text-body">
          PalaySigla uses the Gmail API only to send transactional account emails —
          email confirmation and password reset links. We request only the{' '}
          <span className="body-strong text-ink">gmail.send</span> scope. We do not use
          the Gmail API to read, access, modify, or delete the contents of your
          Gmail mailbox, and we do not store Gmail message content. The OAuth
          refresh token is stored on our server and used only to deliver these
          account emails.
        </p>
        <p className="body-md text-body">
          PalaySigla&apos;s use and transfer to any other app of information
          received from Google APIs will adhere to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className={LEGAL_INLINE_LINK_CLASS}
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Google user data is not sold,
          used for advertising, or shared with third parties except as necessary to
          provide the email delivery service or comply with the law.
        </p>
      </LegalSection>

      <LegalSection title="How we share information">
        <p className="body-md text-body">
          We share information only with service providers that help us operate
          PalaySigla, or when required by law or necessary to protect users:
        </p>
        <ul className="list-disc space-y-2 pl-5 body-md text-body">
          <li>
            <span className="body-strong text-ink">Supabase</span> for
            authentication, database, and file storage.
          </li>
          <li>
            <span className="body-strong text-ink">Vercel</span> to host the
            website.
          </li>
          <li>
            <span className="body-strong text-ink">Render</span> to run the API and
            machine-learning models.
          </li>
          <li>
            <span className="body-strong text-ink">Groq</span> to generate
            assistant replies from the messages you send to the assistant.
          </li>
          <li>
            <span className="body-strong text-ink">OpenStreetMap and Nominatim</span>{' '}
            for maps and geocoding.
          </li>
          <li>
            <span className="body-strong text-ink">Google Gmail API</span> to
            deliver account confirmation and password reset emails.
          </li>
        </ul>
        <p className="body-md text-body">
          These providers process information on our behalf to deliver their
          services, subject to their own terms and privacy policies. We do not sell
          personal information or share it for advertising. We may also disclose
          information if required by law, to protect the safety of users, or as
          part of a merger, acquisition, or transfer of the service.
        </p>
      </LegalSection>

      <LegalSection title="Storage and security">
        <p className="body-md text-body">
          Data is transmitted over HTTPS and stored with our service providers.
          We use row-level security, short-lived signed URLs for uploaded images,
          access controls, and hashed passwords. No method of storage or
          transmission is completely secure, so we cannot guarantee absolute
          security.
        </p>
      </LegalSection>

      <LegalSection title="Retention and deletion">
        <p className="body-md text-body">
          Account and profile information is kept until you delete your account or
          ask us to delete it. Assessment records and original captured images are
          retained for auditability. Marketplace, forum, and message content is
          kept until you remove it or delete your account. We may retain limited
          records where required for legal, security, or fraud-prevention purposes.
          To request deletion, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LEGAL_INLINE_LINK_CLASS}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Your rights and choices">
        <p className="body-md text-body">
          Subject to applicable law, you may request access to, correction of, or
          deletion of your personal information, withdraw consent, or object to
          certain processing. Send requests to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LEGAL_INLINE_LINK_CLASS}>
            {CONTACT_EMAIL}
          </a>
          . You may also contact the National Privacy Commission of the
          Philippines if you believe your data privacy rights have been violated.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p className="body-md text-body">
          PalaySigla is not directed to children under 13. If we learn that a child
          under 13 has provided personal information, we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p className="body-md text-body">
          We may update this policy as the service changes. The latest version will
          always be posted on this page with a new “Last updated” date.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p className="body-md text-body">
          For privacy questions or requests, contact{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LEGAL_INLINE_LINK_CLASS}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}

export default PrivacyPage
