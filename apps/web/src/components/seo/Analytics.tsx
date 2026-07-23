import React from 'react';
import Script from 'next/script';

/**
 * Optional third-party analytics, wired entirely through env vars — never
 * a hardcoded tracking ID. Each integration renders nothing at all unless
 * its own env var is set, so a deployment that configures none of them
 * loads zero third-party scripts. See docs/knowledge-base/admin-manual.md
 * for the full environment-variable reference and setup steps for each
 * of Google Search Console, GA4, GTM, and Microsoft Clarity.
 *
 * - NEXT_PUBLIC_GA4_MEASUREMENT_ID — Google Analytics 4 (gtag.js)
 * - NEXT_PUBLIC_GTM_CONTAINER_ID — Google Tag Manager
 * - NEXT_PUBLIC_CLARITY_PROJECT_ID — Microsoft Clarity
 * - NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION — Search Console ownership meta
 *   tag (read directly in app/layout.tsx's metadata export, not here)
 */
export function Analytics() {
  const ga4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  return (
    <>
      {gtmId && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}
      {ga4Id && !gtmId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${ga4Id}');`}
          </Script>
        </>
      )}
      {clarityId && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${clarityId}");`}
        </Script>
      )}
    </>
  );
}
