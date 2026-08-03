import { getDocContent } from '@/lib/docs'
import { notFound } from 'next/navigation'
import { DocsPage } from './DocsPage'

export default async function DocsHome() {
  const content = getDocContent([])
  if (!content) notFound()
  return <DocsPage content={content} />
}
