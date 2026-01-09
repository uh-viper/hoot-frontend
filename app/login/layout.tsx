import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hoot - Sign In',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
