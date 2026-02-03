let gaInitialized = false

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: any[]) => void
  }
}

export function initGoogleAnalytics() {
  if (gaInitialized) return
  gaInitialized = true

  const measurementId = ((import.meta as any).env?.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() ?? ''
  if (!measurementId) return

  window.dataLayer = window.dataLayer || []
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer?.push(arguments as any)
    }

  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })

  const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
  if (existing) return

  const s = document.createElement('script')
  s.src = src
  s.async = true
  document.head.appendChild(s)
}

export function trackGooglePageView(pathname: string, search: string) {
  initGoogleAnalytics()
  if (typeof window.gtag !== 'function') return

  const pagePath = `${pathname}${search || ''}`
  const pageLocation = `${window.location.origin}${pagePath}`
  window.gtag('event', 'page_view', { page_path: pagePath, page_location: pageLocation })
}
