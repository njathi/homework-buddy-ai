import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Homework Helper AI',
  description: 'Get help with your homework questions using AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 