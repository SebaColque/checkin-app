'use client';
import Script from 'next/script';
import { useEffect } from 'react';
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (function () {
      if (!window.qz || !window.qz.security) return;

      // 1) Entregar certificado público
      window.qz.security.setCertificatePromise(function(resolve: any, reject: any){
        fetch('/api/qz/cert')
          .then(function(r){ return r.text(); })
          .then(resolve).catch(reject);
      });

      // 2) Delegar la firma al backend
      window.qz.security.setSignaturePromise(function(toSign: any){
        return function(resolve: any, reject: any){
          fetch('/api/qz/sign', {
            method: 'POST',
            headers: { 'content-type': 'text/plain' },
            body: toSign
          })
          .then(function(r){ return r.text(); })
          .then(resolve).catch(reject);
        };
      });
    })();
  }, []);
  return (
    <html lang="es">
      <body>
        {/* Cargar ANTES de que se renderice la app */}
        <Script src="/vendor/qz-tray.js" strategy="beforeInteractive" />
        <Script id="qz-dev-security" strategy="beforeInteractive">{`
            (function () {
            if (!window.qz || !window.qz.security) return;

            // 1) Entregar certificado público
            window.qz.security.setCertificatePromise(function(resolve, reject){
              fetch('/api/qz/cert')
                .then(function(r){ return r.text(); })
                .then(resolve).catch(reject);
            });

            // 2) Delegar la firma al backend
            window.qz.security.setSignaturePromise(function(toSign){
              return function(resolve, reject){
                fetch('/api/qz/sign', {
                  method: 'POST',
                  headers: { 'content-type': 'text/plain' },
                  body: toSign
                })
                .then(function(r){ return r.text(); })
                .then(resolve).catch(reject);
              };
            });
          })();
          `}</Script>
        {children}
      </body> 
    </html>
  );
}
