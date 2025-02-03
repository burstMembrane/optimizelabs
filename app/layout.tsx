import { headers } from 'next/headers'
import Providers from './providers'

import './styles/globals.css'
import './styles/markdown.scss'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <html lang={'en'} className="h-full">
        <body className="h-full">
          {children}
        </body>
      </html>
    </Providers>
  )
}
