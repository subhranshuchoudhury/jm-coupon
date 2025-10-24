"use client";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X } from "lucide-react";
import { useState } from "react";

type QRScannerModalProps = {
    onClose: () => void;
    onScan: (result: string) => void;
};

export default function QRScannerModal({ onClose, onScan }: QRScannerModalProps) {
    const [scanError, setScanError] = useState<string | null>(null);

    const handleScan = (result: any) => {
        // The library returns an array of results
        if (result && result.length > 0) {
            onScan(result[0].rawValue);
        }
    };

    const handleError = (err: unknown) => {
        console.error('QR Scan Error:', err);
        setScanError('An unknown error occurred.');
    };

    return (
        // Backdrop
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            {/* Scanner Viewport */}
            <div className="relative w-full max-w-md bg-neutral rounded-box shadow-2xl overflow-hidden aspect-square">
                <Scanner
                    onScan={handleScan}
                    onError={handleError}
                    constraints={{
                        facingMode: 'environment', // Use rear camera
                    }}
                    styles={{
                        container: {
                            width: '100%',
                            height: '100%',
                            paddingTop: '0', // Override default
                        },
                        video: {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        },
                    }}
                />
                {/* Scanning Box Overlay */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="w-full h-full border-4 border-white/50 rounded-lg shadow-inner-lg" />
                </div>
            </div>

            {/* Close Button */}
            <button
                className="btn btn-circle btn-ghost text-white mt-6"
                onClick={onClose}
            >
                <X size={32} />
            </button>

            {/* Error Message */}
            {scanError && (
                <div className="text-center text-error bg-error/20 p-3 rounded-md mt-4 max-w-md">
                    <p className="font-semibold">Could not start scanner</p>
                    <p className="text-sm">{scanError}</p>
                </div>
            )}
        </div>
    );
}
