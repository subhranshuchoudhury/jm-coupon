"use client";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X } from "lucide-react";
import { useState } from "react";

type QRScannerModalProps = {
    onClose: () => void;
    // The onScan function now accepts the raw string result from the QR code
    onScan: (result: string) => void;
};

export default function QRScannerModal({ onClose, onScan }: QRScannerModalProps) {
    const [scanError, setScanError] = useState<string | null>(null);

    const handleScan = (result: any) => {
        // The library returns an array of results
        if (result && result.length > 0) {
            const rawValue = result[0].rawValue;
            onScan(rawValue);
            onClose(); // Close the modal immediately after a successful scan
        }
    };

    const handleError = (err: unknown) => {
        console.error('QR Scan Error:', err);
        setScanError('Could not start the scanner. Check camera permissions.');
    };

    return (
        // Backdrop (z-index needs to be high, e.g., z-50 for typical Tailwind/Next.js setups)
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            {/* Scanner Viewport */}
            <div className="relative w-full max-w-sm bg-neutral rounded-box shadow-2xl overflow-hidden aspect-square">
                <Scanner
                    onScan={handleScan}
                    onError={handleError}
                    constraints={{
                        facingMode: 'environment', // Use rear camera (best for mobile scanning)
                    }}
                    styles={{
                        container: {
                            width: '100%',
                            height: '100%',
                            paddingTop: '0',
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
                    <p className="font-semibold">Scanner Error</p>
                    <p className="text-sm">{scanError}</p>
                </div>
            )}
        </div>
    );
}