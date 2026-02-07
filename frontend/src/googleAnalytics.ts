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

  window.gtag('config', measurementId, { send_page_view: false })

  const anyGtag = document.querySelector(`script[src^="https://www.googletagmanager.com/gtag/js?id="]`) as HTMLScriptElement | null
  if (anyGtag) return

  const s = document.createElement('script')
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
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
