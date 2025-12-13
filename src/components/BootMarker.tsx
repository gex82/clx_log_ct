import { useEffect } from "react"

/**
 * Sets a global marker once React has actually mounted.
 *
 * Why: A production deployment can fail in two different ways:
 *  1) JS bundle fails to load (404/MIME/CSP) -> we show the boot-error panel from index.html.
 *  2) JS loads but React Router is misconfigured (wrong basename) -> can look like a white screen.
 *
 * We only set __AUTOPILOT_BOOTED__ *after* the first React commit so case (1) still shows guidance.
 */
export default function BootMarker() {
  useEffect(() => {
    ;(window as any).__AUTOPILOT_BOOTED__ = true
  }, [])

  return null
}
