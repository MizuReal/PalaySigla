const ICON_PATHS = {
  camera: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <circle cx="12" cy="14" r="3.5" />
      <path d="M8.5 7l1.5-3.5h4L15.5 7" />
    </>
  ),
  scan: (
    <>
      <path d="M3 8V5a2 2 0 0 1 2-2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M4 12h16" />
    </>
  ),
  quality: (
    <>
      <path d="M4 14a8 8 0 1 1 16 0" />
      <path d="M12 14l4-4" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  mold: (
    <>
      <path d="M12 3.5c3 4 6 7 6 11a6 6 0 1 1-12 0c0-4 3-7 6-11z" />
      <circle cx="10.5" cy="13" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="13" cy="16" r="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  grade: (
    <>
      <path d="M3 3h8l10 10-8 8L3 11V3z" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  variety: (
    <>
      <path d="M5 19c0-10 7-15 15-15 0 9-5 15-15 15z" />
      <path d="M6 18c3-4 6-6 9-7" />
      <path d="M3.5 21.5h9" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  shield: (
    <>
      <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18" />
      <path d="M8 21h8" />
      <path d="M12 7a3 3 0 0 0-3 3h6a3 3 0 0 0-3-3z" />
      <path d="M4 6l-1.5 6.5" />
      <path d="M20 6l1.5 6.5" />
      <path d="M2.5 12.5a4 4 0 0 0 8 0" />
      <path d="M13.5 12.5a4 4 0 0 0 8 0" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4 12h16" />
      <path d="M13 5l7 7-7 7" />
    </>
  ),
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  'chevron-right': <path d="M9 5l7 7-7 7" />,
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
}

function Icon({ name, className = 'h-6 w-6' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  )
}

export default Icon
