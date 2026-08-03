import { getDocContent } from '@/lib/docs'
import { notFound } from 'next/navigation'
import { DocsPage } from '../DocsPage'

export default async function DocSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const content = getDocContent(slug)
  if (!content) notFound()
  return <DocsPage content={content} />
}
