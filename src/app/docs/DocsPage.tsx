'use client'

import { renderMarkdown } from '@/lib/docs-client'

export function DocsPage({ content }: { content: string }) {
  const html = renderMarkdown(content)
  return (
    <div
      className="docs-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
