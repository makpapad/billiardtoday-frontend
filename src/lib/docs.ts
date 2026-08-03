import * as fs from 'fs'
import * as path from 'path'

const DOCS_ROOT = path.join(process.cwd(), 'src/content/docs')

export type DocMeta = {
  slug: string[]
  title: string
  filePath: string
}

export function getAllDocs(): DocMeta[] {
  const results: DocMeta[] = []
  walk(DOCS_ROOT, [], results)
  return results.sort((a, b) => a.slug.join('/').localeCompare(b.slug.join('/')))
}

function walk(dir: string, slugPrefix: string[], results: DocMeta[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, [...slugPrefix, entry.name], results)
    } else if (entry.name.endsWith('.md')) {
      const slug = entry.name === 'index.md'
        ? slugPrefix
        : [...slugPrefix, entry.name.replace(/\.md$/, '')]
      const content = fs.readFileSync(fullPath, 'utf8')
      const title = extractTitle(content) || slug[slug.length - 1] || 'Docs'
      results.push({ slug, title, filePath: fullPath })
    }
  }
}

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

export function getDocContent(slug: string[]): string | null {
  // Try exact match first
  const exactPath = path.join(DOCS_ROOT, ...slug) + '.md'
  if (fs.existsSync(exactPath)) {
    return fs.readFileSync(exactPath, 'utf8')
  }
  // Try index.md in directory
  const indexPath = path.join(DOCS_ROOT, ...slug, 'index.md')
  if (fs.existsSync(indexPath)) {
    return fs.readFileSync(indexPath, 'utf8')
  }
  return null
}

export function buildDocTree(): DocTreeNode[] {
  const docs = getAllDocs()
  return buildTree(docs)
}

export type DocTreeNode = {
  title: string
  href: string
  children?: DocTreeNode[]
  isIndex?: boolean
}

function buildTree(docs: DocMeta[]): DocTreeNode[] {
  // Group by first slug segment
  const groups = new Map<string, DocMeta[]>()
  for (const doc of docs) {
    if (doc.slug.length === 0) continue
    const group = doc.slug.length === 1 ? '__root' : doc.slug[0]
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(doc)
  }

  const result: DocTreeNode[] = []

  // Root-level docs
  const rootDocs = groups.get('__root') || []
  for (const doc of rootDocs) {
    result.push({ title: doc.title, href: `/docs/${doc.slug.join('/')}`, isIndex: true })
  }
  groups.delete('__root')

  // Grouped docs
  for (const [group, groupDocs] of Array.from(groups.entries())) {
    const children: DocTreeNode[] = groupDocs
      .sort((a, b) => a.slug.join('/').localeCompare(b.slug.join('/')))
      .map(doc => ({
        title: doc.title,
        href: `/docs/${doc.slug.join('/')}`,
      }))

    // Check if there's a group index
    const indexDoc = groupDocs.find(d => d.slug.length === 2 && d.slug[1] === group)
    const groupTitle = indexDoc?.title || group.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    result.push({ title: groupTitle, href: `/docs/${group}`, children })
  }

  return result
}

export function renderMarkdown(content: string): string {
  let html = escapeHtml(content)

  // Code blocks (must be first)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.trimEnd())
    return `<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4 text-sm"><code${lang ? ` class="language-${lang}"` : ''}>${escaped}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold mt-6 mb-2">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 border-b pb-1">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')

  // Unordered lists
  html = html.replace(/^(\s*)- (.+)$/gm, (_, indent, text) => {
    const level = Math.floor(indent.length / 2)
    return `<li class="ml-${level * 4} list-disc list-inside">${text}</li>`
  })
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>')

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="list-decimal list-inside">$1</li>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline dark:text-blue-400">$1</a>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-6 border-gray-300 dark:border-gray-700">')

  // Paragraphs: wrap remaining text lines in <p>
  html = html.replace(/^(?!<[a-z\/]|<\/?[a-z]|$)(.+)$/gm, '<p class="my-2 leading-relaxed">$1</p>')

  // Clean up empty paragraphs
  html = html.replace(/<p class="my-2 leading-relaxed"><\/p>/g, '')

  // Remove the first h1 (we show title separately)
  html = html.replace(/<h1 class="text-2xl[^>]*>.*?<\/h1>/, '')

  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
