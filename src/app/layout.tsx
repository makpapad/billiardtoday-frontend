import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Billiard Today',
    description: 'Billiard Tournament Results',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="el">
            <body>{children}</body>
        </html>
    )
}
