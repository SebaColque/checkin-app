'use client';
import Script from 'next/script';
import { useEffect } from 'react';
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', function() {
        if (window.qz && window.qz.security) {
          // DEV: dejar vacío (requiere "Allow unsigned" en QZ Tray)
          window.qz.security.setCertificatePromise((resolve: any, reject: any) => resolve());
          window.qz.security.setSignaturePromise((resolve: any, reject: any) => resolve());
        }
      });
    }
  }, []);
  return (
    <html lang="es">
      <body>
        {/* Cargar ANTES de que se renderice la app */}
        <Script src="/vendor/qz-tray.js" strategy="beforeInteractive" />
        <Script id="qz-dev-security" strategy="afterInteractive">{`
            if (window.qz && window.qz.security) {
              // DEV: sin certificado ni firma; requiere "Allow unsigned" en QZ Tray
              window.qz.security.setCertificatePromise((resolve, reject) => resolve());
              window.qz.security.setSignaturePromise((resolve, reject) => resolve());
            }
          `}</Script>
        {children}
      </body> 
    </html>
  );
}
