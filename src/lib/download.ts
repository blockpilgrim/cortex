/**
 * File download utility.
 *
 * Generates a Blob from content, creates an object URL, and triggers a
 * browser download. Cleans up the object URL after download initiation.
 */

/**
 * Trigger a file download in the browser.
 *
 * Creates a temporary anchor element with an object URL, clicks it to
 * initiate the download, then revokes the URL and removes the anchor.
 */
export function triggerDownload(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()

  // Clean up after a short delay to ensure the download starts
  setTimeout(() => {
    URL.revokeObjectURL(url)
    document.body.removeChild(anchor)
  }, 100)
}

/** Trigger a JSON file download. */
export function downloadJson(content: string, filename: string): void {
  triggerDownload(content, filename, 'application/json')
}

/** Trigger a Markdown file download. */
export function downloadMarkdown(content: string, filename: string): void {
  triggerDownload(content, filename, 'text/markdown')
}
