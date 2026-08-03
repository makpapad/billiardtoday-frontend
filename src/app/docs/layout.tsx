'use client'

import { buildDocTree, type DocTreeNode } from '@/lib/docs-client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const tree = buildDocTree()
  const pathname = usePathname()

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <nav className="sticky top-8 space-y-1">
          <Link
            href="/docs"
            className="block rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            📚 Documentation
          </Link>
          <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
          {tree.map((node) => (
            <TreeNode key={node.href} node={node} pathname={pathname} />
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1">
        <article className="prose prose-gray dark:prose-invert max-w-none">
          {children}
        </article>
      </main>
    </div>
  )
}

function TreeNode({ node, pathname, depth = 0 }: { node: DocTreeNode; pathname: string; depth?: number }) {
  const isActive = pathname === node.href
  return (
    <div>
      <Link
        href={node.href}
        className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
          isActive
            ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {node.title}
      </Link>
      {node.children?.map((child) => (
        <TreeNode key={child.href} node={child} pathname={pathname} depth={depth + 1} />
      ))}
    </div>
  )
}
