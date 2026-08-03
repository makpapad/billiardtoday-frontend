/**
 * Client-side documentation utilities - no Node.js dependencies
 * The actual doc tree is built at build time and passed as a static import
 */

export type DocMeta = {
  slug: string[]
  title: string
  filePath: string
}

export type DocTreeNode = {
  title: string
  href: string
  children?: DocTreeNode[]
  isIndex?: boolean
}

// This will be populated at build time by a script
// For now, we export empty functions that will be replaced
let cachedTree: DocTreeNode[] | null = null

export function buildDocTree(): DocTreeNode[] {
  if (cachedTree) return cachedTree
  // This will be replaced at build time with the actual tree
  cachedTree = []
  return cachedTree
}

export function setDocTree(tree: DocTreeNode[]) {
  cachedTree = tree
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
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
}