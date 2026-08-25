function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div className="mb-10 max-w-3xl lg:mb-12">
      <p className="caption-md text-mute">{eyebrow}</p>
      <h2 className="display-lg mt-3 text-ink">{title}</h2>
      {sub && <p className="body-md mt-4 text-body">{sub}</p>}
    </div>
  )
}

export default SectionHeader
