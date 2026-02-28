import { render, screen } from '@testing-library/react'
import App from '@/App'
import { useAppStore } from '@/lib/store'

// Reset Zustand state between tests and start with sidebar closed
// to avoid the Sheet overlay interfering with accessibility queries in jsdom
beforeEach(() => {
  useAppStore.setState({ sidebarOpen: false })
})

describe('App', () => {
  it('renders the Cortex heading in the top bar', () => {
    render(<App />)
    expect(screen.getByText('Cortex')).toBeInTheDocument()
  })

  it('renders all three model columns', () => {
    render(<App />)
    expect(screen.getByText('Claude')).toBeInTheDocument()
    expect(screen.getByText('ChatGPT')).toBeInTheDocument()
    expect(screen.getByText('Gemini')).toBeInTheDocument()
  })

  it('renders the input bar', () => {
    render(<App />)
    // No API keys configured, so it shows the "configure" placeholder
    const input = screen.getByPlaceholderText(
      'Configure API keys in settings to start...',
    )
    expect(input).toBeInTheDocument()
    expect(input).toBeDisabled()
  })

  it('renders a disabled send button when no API keys are configured', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: 'Send message' })
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('renders the sidebar toggle button', () => {
    render(<App />)
    expect(
      screen.getByRole('button', { name: 'Toggle sidebar' }),
    ).toBeInTheDocument()
  })

  it('renders the new conversation button in the top bar', () => {
    render(<App />)
    expect(
      screen.getByRole('button', { name: 'New conversation' }),
    ).toBeInTheDocument()
  })
})
