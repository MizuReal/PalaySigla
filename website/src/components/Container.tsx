import type { ReactNode } from 'react'

interface ContainerProps {
  className?: string
  children: ReactNode
}

function Container({ className = '', children }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-page px-6 lg:px-12 ${className}`}>
      {children}
    </div>
  )
}

export default Container
