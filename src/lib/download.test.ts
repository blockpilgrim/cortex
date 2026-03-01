/**
 * Unit tests for the download utility module.
 *
 * Covers:
 * - triggerDownload: Blob creation, anchor setup, click, cleanup
 * - downloadJson: correct MIME type and delegation
 * - downloadMarkdown: correct MIME type and delegation
 *
 * These tests mock DOM APIs (document.createElement, URL.createObjectURL)
 * since jsdom does not fully support Blob/Object URL interactions.
 */

describe('triggerDownload', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>
  let appendChildSpy: ReturnType<typeof vi.spyOn>
  let removeChildSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.fn>
  let mockAnchor: HTMLAnchorElement

  beforeEach(() => {
    vi.useFakeTimers()

    // Mock URL.createObjectURL and revokeObjectURL
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost/fake-url')
    revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})

    // Create a real anchor element but spy on click
    mockAnchor = document.createElement('a')
    clickSpy = vi.fn()
    mockAnchor.click = clickSpy

    vi.spyOn(document, 'createElement').mockReturnValue(
      mockAnchor as unknown as HTMLElement,
    )
    appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockReturnValue(mockAnchor)
    removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockReturnValue(mockAnchor)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // Dynamic import to avoid module-level side effects with mocks
  async function importAndTrigger(
    content: string,
    filename: string,
    mimeType: string,
  ) {
    const { triggerDownload } = await import('@/lib/download')
    triggerDownload(content, filename, mimeType)
  }

  it('creates an object URL from a Blob with the correct MIME type', async () => {
    await importAndTrigger('test content', 'test.json', 'application/json')

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/json')
  })

  it('sets the anchor href to the object URL', async () => {
    await importAndTrigger('test content', 'test.json', 'application/json')

    expect(mockAnchor.href).toContain('blob:http://localhost/fake-url')
  })

  it('sets the anchor download attribute to the filename', async () => {
    await importAndTrigger('test content', 'my-file.json', 'application/json')

    expect(mockAnchor.download).toBe('my-file.json')
  })

  it('hides the anchor element', async () => {
    await importAndTrigger('test content', 'test.json', 'application/json')

    expect(mockAnchor.style.display).toBe('none')
  })

  it('appends the anchor to document.body', async () => {
    await importAndTrigger('test content', 'test.json', 'application/json')

    expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor)
  })

  it('clicks the anchor to trigger download', async () => {
    await importAndTrigger('test content', 'test.json', 'application/json')

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('revokes the object URL after a short delay', async () => {
    await importAndTrigger('test content', 'test.json', 'application/json')

    expect(revokeObjectURLSpy).not.toHaveBeenCalled()

    // Advance timers past the 100ms cleanup delay
    vi.advanceTimersByTime(100)

    expect(revokeObjectURLSpy).toHaveBeenCalledWith(
      'blob:http://localhost/fake-url',
    )
  })

  it('removes the anchor from document.body after cleanup', async () => {
    await importAndTrigger('test content', 'test.json', 'application/json')

    expect(removeChildSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor)
  })
})

describe('downloadJson', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost/fake-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(document.body, 'appendChild').mockReturnValue(
      document.createElement('a'),
    )
    vi.spyOn(document.body, 'removeChild').mockReturnValue(
      document.createElement('a'),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('creates a Blob with application/json MIME type', async () => {
    const { downloadJson } = await import('@/lib/download')
    downloadJson('{"key": "value"}', 'data.json')

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blob.type).toBe('application/json')
  })

  it('passes the filename to the anchor download attribute', async () => {
    const mockAnchor = document.createElement('a')
    mockAnchor.click = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue(
      mockAnchor as unknown as HTMLElement,
    )

    const { downloadJson } = await import('@/lib/download')
    downloadJson('{}', 'export.json')

    expect(mockAnchor.download).toBe('export.json')
  })
})

describe('downloadMarkdown', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost/fake-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(document.body, 'appendChild').mockReturnValue(
      document.createElement('a'),
    )
    vi.spyOn(document.body, 'removeChild').mockReturnValue(
      document.createElement('a'),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('creates a Blob with text/markdown MIME type', async () => {
    const { downloadMarkdown } = await import('@/lib/download')
    downloadMarkdown('# Hello', 'readme.md')

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/markdown')
  })

  it('passes the filename to the anchor download attribute', async () => {
    const mockAnchor = document.createElement('a')
    mockAnchor.click = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue(
      mockAnchor as unknown as HTMLElement,
    )

    const { downloadMarkdown } = await import('@/lib/download')
    downloadMarkdown('# Content', 'notes.md')

    expect(mockAnchor.download).toBe('notes.md')
  })
})
