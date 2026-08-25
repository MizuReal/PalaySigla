function Container({ className = '', children }) {
  return (
    <div className={`mx-auto w-full max-w-page px-6 lg:px-12 ${className}`}>
      {children}
    </div>
  )
}

export default Container
