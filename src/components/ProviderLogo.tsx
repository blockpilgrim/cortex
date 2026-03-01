/**
 * Provider logo SVGs for column headers.
 *
 * Anthropic and Gemini logos use transparent backgrounds (dark-theme safe).
 * OpenAI logo uses a white circle background (intentional — part of the brand).
 */

import type { Provider } from '@/lib/db/types'

interface ProviderLogoProps {
  provider: Provider
  size?: number
}

export function ProviderLogo({ provider, size = 18 }: ProviderLogoProps) {
  switch (provider) {
    case 'claude':
      return <AnthropicLogo size={size} />
    case 'chatgpt':
      return <OpenAILogo size={size} />
    case 'gemini':
      return <GeminiLogo size={size} />
  }
}

/** Official Anthropic spark mark — uses currentColor for dark-theme compatibility. */
function AnthropicLogo({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 101"
      fill="none"
      overflow="visible"
      aria-hidden="true"
      className="text-[#D4714E]"
    >
      <path d="M96 40L99.5 42l0 1.5-1 3.5-42.5 10-4-9.93L96 40z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(330deg) scaleY(0.97) rotate(-330deg)' }} />
      <path d="M80.1 10.59l4.9 1.03 1.3 1.6 1.24 3.84-.51 2.45L58.5 58.5 49 49l26.3-34.51 4.8-3.9z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(300deg) scaleY(1.06114) rotate(-300deg)' }} />
      <path d="M55.5 4.5l3-2 2.5 1 2.5 3.5-6.85 41.16-4.65-3.16-2-5.5 3.5-31 2-4z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(270deg) scaleY(1.1578) rotate(-270deg)' }} />
      <path d="M23.43 5.16l3.08-3.94 2.01-.46 3.99.58 1.97 1.54 14.35 31.8 5.19 15.11-6.07 3.38-23.14-42z-1.37-6.03z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(240deg) scaleY(1.25447) rotate(-240deg)' }} />
      <path d="M8.5 27l-1-4 3-3.5 3.5.5 1 0 21 15.5 6.5 5 9 7-5 8.5-4.5-3.5-3-3-29-20.5-1.5-2z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(210deg) scaleY(1.18386) rotate(-210deg)' }} />
      <path d="M2.5 53L.24 50.5l0-2.22 2.26-.78L28 49l25 2-.81 4.98L4.5 53.5 2.5 53z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(180deg) scaleY(1.0572) rotate(-180deg)' }} />
      <path d="M17.5 79.03h-5l-1.99-2.29V74l8.49-6L53.5 46.03 57 52 17.5 79.03z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(150deg) scaleY(0.975529) rotate(-150deg)' }} />
      <path d="M27 93l-2 .5-3-1.5.5-2.5L52 50.5 56 56 34 85l-7 8z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(120deg) scaleY(1.075) rotate(-120deg)' }} />
      <path d="M52 98l-1.5 2-3 1-2.5-2-1.5-3 7.5-40.5 4.5.5L52 98z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(90deg) scaleY(0.925) rotate(-90deg)' }} />
      <path d="M77.5 87v4l-.5 1.5-2 1-3.5-.47-24.03-35.77L57 50l8-14.5.75 5.25L77.5 87z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(60deg) scaleY(0.997) rotate(-60deg)' }} />
      <path d="M89 81l.5 2.5-1.5 2-1.5-.5-8.5-6-13-11.5-10-7 3-9.5 5 3 3 5.5 23 21.5z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(30deg) scaleY(0.985) rotate(-30deg)' }} />
      <path d="M82.5 55.5l12.5 1 3 2 2 3v2.16l-5.5 2.34-28-7-11.5-.5 3-10.5 8 6 16.5 1.5z" fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(0deg) scaleY(1.045) rotate(0deg)' }} />
    </svg>
  )
}

/** OpenAI knot symbol on a white disc. */
function OpenAILogo({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1 -1 26 26"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="white" />
      <g transform="translate(12,12) scale(0.75) translate(-12,-12)">
        <path
          d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4114-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0974-2.3616l2.603-1.5018 2.6032 1.5018v3.0036l-2.6032 1.5018-2.603-1.5018Z"
          fill="#202123"
        />
      </g>
    </svg>
  )
}

/** Google Gemini 4-pointed star with blue-to-purple gradient. */
function GeminiLogo({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="gemini-star-gradient"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <path
        d="M12 0C13.5 7 17 10.5 24 12 17 13.5 13.5 17 12 24 10.5 17 7 13.5 0 12 7 10.5 10.5 7 12 0Z"
        fill="url(#gemini-star-gradient)"
      />
    </svg>
  )
}
