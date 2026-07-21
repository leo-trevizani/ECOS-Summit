/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

interface QrScannerComponentProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
}

export const QrScannerComponent: React.FC<QrScannerComponentProps> = ({
  onScanSuccess,
  onScanError
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const elementId = "ecos-qr-reader-video-element";

  useEffect(() => {
    // Attempt to start camera scanner automatically on mount
    startScanner();

    return () => {
      // Cleanup to release the camera immediately when unmounted
      const instance = qrCodeInstanceRef.current;
      if (instance && instance.isScanning) {
        instance.stop()
          .then(() => {
            console.log("QR scanner stopped successfully during unmount.");
          })
          .catch((err) => {
            console.warn("Failed to stop QR scanner during unmount:", err);
          });
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      setInitError(null);
      setCameraActive(false);

      // Stop any existing session
      if (qrCodeInstanceRef.current) {
        if (qrCodeInstanceRef.current.isScanning) {
          await qrCodeInstanceRef.current.stop();
        }
        qrCodeInstanceRef.current = null;
      }

      // Create a fresh instance targeting our container
      const instance = new Html5Qrcode(elementId);
      qrCodeInstanceRef.current = instance;

      await instance.start(
        { facingMode: "environment" },
        {
          fps: 12,
          qrbox: (width, height) => {
            // Take 70% of the viewport container as scanning area, with a minimum size of 50px
            const size = Math.min(width, height) * 0.7;
            const finalSize = Math.max(50, Math.floor(size));
            return { width: finalSize, height: finalSize };
          }
        },
        (decodedText) => {
          // Send decoded text to callback
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Verbose frame-by-frame scanner log, usually ignored
          if (onScanError) {
            onScanError(errorMessage);
          }
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      console.warn("Error starting camera:", err);
      setCameraActive(false);
      
      // Categorize errors for clear user-friendly instructions
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
        setInitError("Acesso à câmera negado. Ative a permissão nas configurações do navegador.");
      } else if (err?.name === "NotFoundError" || err?.message?.includes("NotFound")) {
        setInitError("Nenhuma câmera encontrada neste dispositivo.");
      } else {
        setInitError("Não foi possível conectar com a câmera. Verifique se outro app a está usando.");
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Viewfinder Window */}
      <div className="w-full aspect-square max-w-[260px] bg-brand-dark border border-brand-border rounded-2xl overflow-hidden relative flex flex-col items-center justify-center shadow-inner">
        
        {/* Actual Video Element loaded by html5-qrcode */}
        <div id={elementId} className="w-full h-full object-cover" />

        {/* Video feed overlay blocker if camera is inactive */}
        {!cameraActive && (
          <div className="absolute inset-0 bg-brand-surface/95 flex flex-col items-center justify-center p-4 text-center z-10 space-y-3">
            {initError ? (
              <>
                <CameraOff className="w-9 h-9 text-brand-orange stroke-[1.5]" />
                <div className="space-y-1 px-2">
                  <p className="text-xs font-bold text-slate-200">Câmera Indisponível</p>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    {initError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-3 py-1.5 bg-brand-dark hover:bg-brand-dark/80 border border-brand-border text-slate-300 hover:text-white rounded-xl text-[10px] font-mono flex items-center gap-1 cursor-pointer transition active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Tentar Novamente</span>
                </button>
              </>
            ) : (
              <>
                <Camera className="w-9 h-9 text-brand-orange animate-pulse stroke-[1.5]" />
                <p className="text-xs text-white/50 animate-pulse font-mono text-[10px]">Acessando câmera...</p>
              </>
            )}
          </div>
        )}

        {/* Reticles and Laser scan guide (shown only when scanning is active) */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Corner Bracket Reticles */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-brand-orange rounded-tl" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-brand-orange rounded-tr" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-brand-orange rounded-bl" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-brand-orange rounded-br" />
            
            {/* Interactive Scanning Line Laser */}
            <div className="absolute inset-x-4 top-[50%] h-0.5 bg-brand-orange/75 shadow-[0_0_8px_rgba(242,125,38,0.8)] animate-[bounce_2s_infinite_ease-in-out]" />
          </div>
        )}
      </div>
    </div>
  );
};
