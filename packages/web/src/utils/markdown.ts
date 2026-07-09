/**
 * 轻量级 Markdown 渲染工具
 *
 * 将 Markdown 文本解析为带样式 class 的 HTML 字符串，
 * 支持：标题、分割线、表格、引用、有序/无序列表、段落，
 * 以及行内代码、加粗、斜体。
 */

/* ------------------------------------------------------------------ */
/* 内联处理                                                             */
/* ------------------------------------------------------------------ */

/**
 * HTML 转义，防止 XSS 攻击
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 解析内联 Markdown 元素（行内代码、加粗、斜体）
 */
export function parseInlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|\s)\*([^*]+)\*/g, '$1<em>$2</em>')
}

/* ------------------------------------------------------------------ */
/* 表格处理                                                             */
/* ------------------------------------------------------------------ */

/**
 * 检查当前位置是否为 Markdown 表格起始行
 */
function isTableStart(lines: string[], index: number): boolean {
  const current = lines[index]?.trim()
  const next = lines[index + 1]?.trim()
  return Boolean(
    current?.startsWith('|') &&
      next?.startsWith('|') &&
      /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(next),
  )
}

/**
 * 将表格行拆分为单元格
 */
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

/**
 * 渲染 Markdown 表格为 HTML
 */
function renderTable(lines: string[]): string {
  const rows = lines.map(splitTableRow)
  const header = rows[0] || []
  const body = rows.slice(2)
  return `
    <div class="md-table-wrap">
      <table class="md-table">
        <thead><tr>${header.map((cell) => `<th>${parseInlineMarkdown(cell)}</th>`).join('')}</tr></thead>
        <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${parseInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  `
}

/* ------------------------------------------------------------------ */
/* 块级元素解析器                                                       */
/* ------------------------------------------------------------------ */

interface BlockParseResult {
  html: string
  newIndex: number
}

interface BlockParser {
  test: (lines: string[], index: number, trimmed: string) => boolean
  parse: (lines: string[], index: number, flushParagraph: () => void) => BlockParseResult
}

/** 标题解析器 */
const headingParser: BlockParser = {
  test: (_, __, trimmed) => /^(#{1,4})\s+(.+)$/.test(trimmed),
  parse: (lines, index, flush) => {
    flush()
    const match = /^(#{1,4})\s+(.+)$/.exec(lines[index].trim())!
    const level = Math.min(match[1].length, 4)
    return {
      html: `<h${level} class="md-h md-h${level}">${parseInlineMarkdown(match[2])}</h${level}>`,
      newIndex: index,
    }
  },
}

/** 分割线解析器 */
const hrParser: BlockParser = {
  test: (_, __, trimmed) => /^---+$/.test(trimmed),
  parse: (_, index, flush) => {
    flush()
    return { html: '<hr class="md-hr"/>', newIndex: index }
  },
}

/** 表格解析器 */
const tableParser: BlockParser = {
  test: (lines, index) => isTableStart(lines, index),
  parse: (lines, index, flush) => {
    flush()
    const tableLines: string[] = [lines[index], lines[index + 1]]
    let currentIndex = index + 2
    while (currentIndex < lines.length && lines[currentIndex].trim().startsWith('|')) {
      tableLines.push(lines[currentIndex])
      currentIndex += 1
    }
    return { html: renderTable(tableLines), newIndex: currentIndex - 1 }
  },
}

/** 引用解析器 */
const quoteParser: BlockParser = {
  test: (_, __, trimmed) => /^>\s?/.test(trimmed),
  parse: (lines, index, flush) => {
    flush()
    const quoteLines = [lines[index].trim().replace(/^>\s?/, '')]
    let currentIndex = index + 1
    while (currentIndex < lines.length && /^>\s?/.test(lines[currentIndex].trim())) {
      quoteLines.push(lines[currentIndex].trim().replace(/^>\s?/, ''))
      currentIndex += 1
    }
    return {
      html: `<blockquote class="md-quote">${quoteLines.map(parseInlineMarkdown).join('<br/>')}</blockquote>`,
      newIndex: currentIndex - 1,
    }
  },
}

/** 列表解析器 */
const listParser: BlockParser = {
  test: (_, __, trimmed) => /^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed),
  parse: (lines, index, flush) => {
    flush()
    const ordered = /^\d+[.)]\s+/.test(lines[index].trim())
    const items: string[] = []
    let currentIndex = index
    while (currentIndex < lines.length) {
      const item = lines[currentIndex].trim()
      const match = ordered ? /^\d+[.)]\s+(.+)$/.exec(item) : /^[-*]\s+(.+)$/.exec(item)
      if (!match) break
      items.push(`<li>${parseInlineMarkdown(match[1])}</li>`)
      currentIndex += 1
    }
    return {
      html: `<${ordered ? 'ol' : 'ul'} class="md-list">${items.join('')}</${ordered ? 'ol' : 'ul'}>`,
      newIndex: currentIndex - 1,
    }
  },
}

/** 块级元素解析器列表 */
const blockParsers: BlockParser[] = [headingParser, hrParser, tableParser, quoteParser, listParser]

/* ------------------------------------------------------------------ */
/* 主入口                                                              */
/* ------------------------------------------------------------------ */

/**
 * 渲染 Markdown 内容为 HTML
 */
export function renderMarkdown(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let paragraph: string[] = []

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push(`<p class="md-p">${paragraph.map(parseInlineMarkdown).join('<br/>')}</p>`)
    paragraph = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      continue
    }

    let handled = false
    for (const parser of blockParsers) {
      if (parser.test(lines, index, trimmed)) {
        const result = parser.parse(lines, index, flushParagraph)
        blocks.push(result.html)
        index = result.newIndex
        handled = true
        break
      }
    }

    if (!handled) {
      paragraph.push(line)
    }
  }

  flushParagraph()
  return `<div class="atelier-md">${blocks.join('')}</div>`
}
