import { NextRequest, NextResponse } from 'next/server'

/**
 * Κατέβασμα εικόνας/αρχείου από το media library του Strapi.
 *
 * Γιατί υπάρχει: τα media σερβίρονται από άλλο origin (app.billiardtoday.com),
 * οπότε το `download` χαρακτηριστικό του <a> αγνοείται από τους browsers και η
 * εικόνα απλώς ανοίγει σε νέα καρτέλα. Εδώ την κατεβάζουμε server-side και τη
 * στέλνουμε με `Content-Disposition: attachment`.
 *
 * Χρήση: /api/download?url=<encoded media url>&name=<optional filename>
 */

const ALLOWED_HOSTS = new Set([
    'app.billiardtoday.com',
    'billiardtoday.com',
    'www.billiardtoday.com',
])

const sanitizeFilename = (raw: string | null, fallback: string): string => {
    const base = (raw || '').trim().split(/[\\/]/).pop() || ''
    const cleaned = base.replace(/[^\w.\- ]+/g, '').trim()
    return cleaned.length > 0 ? cleaned : fallback
}

export async function GET(req: NextRequest) {
    const rawUrl = req.nextUrl.searchParams.get('url')
    if (!rawUrl) {
        return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    let target: URL
    try {
        target = new URL(rawUrl)
    } catch {
        return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
    }

    if (!/^https?:$/.test(target.protocol) || !ALLOWED_HOSTS.has(target.hostname)) {
        return NextResponse.json({ error: 'Host not allowed' }, { status: 400 })
    }

    const upstream = await fetch(target.toString(), { cache: 'no-store' })
    if (!upstream.ok || !upstream.body) {
        return NextResponse.json(
            { error: `Upstream responded ${upstream.status}` },
            { status: 502 },
        )
    }

    const filename = sanitizeFilename(
        req.nextUrl.searchParams.get('name'),
        sanitizeFilename(target.pathname, 'download'),
    )
    const contentType =
        upstream.headers.get('content-type') || 'application/octet-stream'

    return new NextResponse(upstream.body, {
        status: 200,
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'public, max-age=3600',
        },
    })
}
