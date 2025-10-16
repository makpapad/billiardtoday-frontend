import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    metadataBase: new URL('https://billiardtoday.com/tournaments'),
    title: {
        default: 'Tournaments | Billiard Today',
        template: '%s | Billiard Today'
    },
    description: 'Αποτελέσματα και πληροφορίες για τουρνουά μπιλιάρδου στην Ελλάδα',
    keywords: ['billiard', 'tournaments', 'μπιλιάρδο', 'τουρνουά', 'αποτελέσματα'],
    authors: [{ name: 'Billiard Today' }],
    creator: 'Billiard Today',
    publisher: 'Billiard Today',
    alternates: {
        canonical: '/',
    },
    openGraph: {
        type: 'website',
        locale: 'el_GR',
        url: 'https://billiardtoday.com/tournaments',
        siteName: 'Billiard Today',
        title: 'Tournaments | Billiard Today',
        description: 'Αποτελέσματα και πληροφορίες για τουρνουά μπιλιάρδου στην Ελλάδα',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Tournaments | Billiard Today',
        description: 'Αποτελέσματα και πληροφορίες για τουρνουά μπιλιάρδου στην Ελλάδα',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
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
