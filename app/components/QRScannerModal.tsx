"use client";
import { Scanner } from "@yudiel/react-qr-scanner";
import { ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

export type ImportedQrDetails = {
    code: string;
    company: string;
    mrp: number;
    points: number;
};

type CompanyOption = {
    id: string;
    name: string;
    conversion_factor: number;
};

type GalleryCode = ImportedQrDetails & {
    id: string;
    fileName: string;
};

type QRScannerModalProps = {
    onClose: () => void;
    onScan: (result: string) => void;
    onSaveAll?: (codes: ImportedQrDetails[]) => Promise<void>;
    companies?: CompanyOption[];
    enableCouponDetails?: boolean;
};

export default function QRScannerModal({ onClose, onScan, onSaveAll, companies = [], enableCouponDetails = false }: QRScannerModalProps) {
    const [scanError, setScanError] = useState<string | null>(null);
    const [isReadingImage, setIsReadingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [galleryCodes, setGalleryCodes] = useState<GalleryCode[]>([]);
    const [activeCodeIndex, setActiveCodeIndex] = useState(0);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const activeCode = galleryCodes[activeCodeIndex];

    const handleScan = (result: any) => {
        if (result && result.length > 0) {
            onScan(result[0].rawValue);
            onClose();
        }
    };

    const handleError = (err: unknown) => {
        console.error("QR Scan Error:", err);
        setScanError("Could not start the scanner. Check camera permissions.");
    };

    const handleGalleryImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const images = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (!images.length) return;

        setScanError(null);
        setIsReadingImage(true);

        try {
            if (!("BarcodeDetector" in window)) {
                setScanError("Your browser does not support image scanning. Please use the camera.");
                return;
            }

            const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
            const decodedCodes: GalleryCode[] = [];
            let unreadableCount = 0;

            for (const image of images) {
                const bitmap = await createImageBitmap(image);
                try {
                    const results = await detector.detect(bitmap);
                    const qrCode = results[0]?.rawValue;
                    if (qrCode) {
                        decodedCodes.push({
                            id: `${image.name}-${image.lastModified}-${decodedCodes.length}`,
                            fileName: image.name,
                            code: qrCode,
                            company: "",
                            mrp: 0,
                            points: 0,
                        });
                    } else {
                        unreadableCount += 1;
                    }
                } finally {
                    bitmap.close();
                }
            }

            if (!decodedCodes.length) {
                setScanError("No QR codes were found in the selected images.");
                return;
            }

            setGalleryCodes((codes) => [...codes, ...decodedCodes]);
            setActiveCodeIndex(galleryCodes.length);
            if (unreadableCount) {
                setScanError(`No QR code was found in ${unreadableCount} selected image${unreadableCount === 1 ? "" : "s"}.`);
            }
        } catch (error) {
            console.error("QR image scan error:", error);
            setScanError("Could not read the selected images. Please try again.");
        } finally {
            setIsReadingImage(false);
        }
    };

    const updateActiveCode = (code: string) => {
        setGalleryCodes((codes) => codes.map((item, index) => index === activeCodeIndex ? { ...item, code } : item));
    };

    const updateActiveCompany = (company: string) => {
        const selectedCompany = companies.find((item) => item.id === company);
        setGalleryCodes((codes) => codes.map((item, index) => {
            if (index !== activeCodeIndex) return item;
            const points = selectedCompany && item.mrp > 0
                ? Math.round((item.mrp * selectedCompany.conversion_factor) / 100)
                : item.points;
            return { ...item, company, points };
        }));
    };

    const updateActiveMrp = (mrp: number) => {
        const selectedCompany = companies.find((item) => item.id === activeCode.company);
        const points = selectedCompany && mrp > 0
            ? Math.round((mrp * selectedCompany.conversion_factor) / 100)
            : activeCode.points;
        setGalleryCodes((codes) => codes.map((item, index) => index === activeCodeIndex ? { ...item, mrp, points } : item));
    };

    const updateActivePoints = (points: number) => {
        setGalleryCodes((codes) => codes.map((item, index) => index === activeCodeIndex ? { ...item, points } : item));
    };

    const deleteActiveCode = () => {
        setGalleryCodes((codes) => codes.filter((_, index) => index !== activeCodeIndex));
        setActiveCodeIndex((index) => Math.max(0, index - 1));
    };

    const saveAll = async () => {
        if (!allDetailsAdded) return;
        if (!onSaveAll) {
            setScanError("Saving multiple QR codes is not available here.");
            return;
        }

        setIsSaving(true);
        try {
            await onSaveAll(galleryCodes.map(({ code, company, mrp, points }) => ({ code: code.trim(), company, mrp, points })));
            onClose();
        } catch (error) {
            console.error("Could not save imported QR codes:", error);
            const message = error instanceof Error ? error.message : "Could not save the imported QR codes.";
            setScanError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const requiresCouponDetails = enableCouponDetails;
    const allDetailsAdded = galleryCodes.length > 0 && galleryCodes.every((item) => (
        item.code.trim() && (!requiresCouponDetails || (item.company && item.mrp > 0 && item.points > 0))
    ));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            {activeCode ? (
                <div className="w-full max-w-md rounded-box bg-base-100 p-6 shadow-2xl">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold">Review imported QR codes</h2>
                            <p className="text-sm text-base-content/70">QR {activeCodeIndex + 1} of {galleryCodes.length}: {activeCode.fileName}</p>
                        </div>
                        <button className="btn btn-circle btn-ghost btn-sm" onClick={onClose} disabled={isSaving} aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <label className="form-control">
                            <span className="label-text mb-2">QR code</span>
                            <input
                                className="input input-bordered w-full"
                                value={activeCode.code}
                                onChange={(event) => updateActiveCode(event.target.value)}
                                disabled={isSaving}
                                autoFocus
                            />
                        </label>

                        {requiresCouponDetails && (
                            <>
                                <label className="form-control">
                                    <span className="label-text mb-2">Company</span>
                                    <select className="select select-bordered w-full" value={activeCode.company} onChange={(event) => updateActiveCompany(event.target.value)} disabled={isSaving}>
                                        <option value="">Select a company</option>
                                        {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                                    </select>
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-2">MRP</span>
                                    <input className="input input-bordered w-full" type="number" min="0" step="0.01" value={activeCode.mrp || ""} onChange={(event) => updateActiveMrp(Number(event.target.value))} disabled={isSaving} />
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-2">Points value</span>
                                    <input className="input input-bordered w-full" type="number" min="1" value={activeCode.points || ""} onChange={(event) => updateActivePoints(Number(event.target.value))} disabled={isSaving} />
                                    <span className="mt-1 text-xs text-base-content/70">Points are calculated from the selected company and MRP; they can be changed manually.</span>
                                </label>
                            </>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-2">
                        <button className="btn btn-outline" onClick={() => setActiveCodeIndex((index) => index - 1)} disabled={activeCodeIndex === 0 || isSaving}>
                            <ChevronLeft size={18} /> Prev
                        </button>
                        <button className="btn btn-error btn-outline" onClick={deleteActiveCode} disabled={isSaving}>
                            <Trash2 size={18} /> Delete
                        </button>
                        <button className="btn btn-outline" onClick={() => setActiveCodeIndex((index) => index + 1)} disabled={activeCodeIndex === galleryCodes.length - 1 || isSaving}>
                            Next <ChevronRight size={18} />
                        </button>
                    </div>

                    {allDetailsAdded && (
                        <button className="btn btn-primary mt-6 w-full" onClick={saveAll} disabled={isSaving}>
                            {isSaving ? <span className="loading loading-spinner loading-sm" /> : `Save all (${galleryCodes.length})`}
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex w-full max-w-sm flex-col items-center">
                    <div className="relative aspect-square w-full overflow-hidden rounded-box bg-neutral shadow-2xl">
                        <Scanner
                            onScan={handleScan}
                            onError={handleError}
                            paused={isReadingImage}
                            scanDelay={2000}
                            constraints={{ facingMode: "environment" }}
                            styles={{
                                container: { width: "100%", height: "100%", paddingTop: "0" },
                                video: { width: "100%", height: "100%", objectFit: "cover" },
                            }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="h-full w-full rounded-lg border-4 border-white/50 shadow-inner-lg" />
                        </div>
                    </div>

                    <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryImages} />
                    <button
                        className="btn btn-outline mt-6 border-white text-white hover:bg-white hover:text-black"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={isReadingImage}
                    >
                        {isReadingImage ? <span className="loading loading-spinner loading-sm" /> : <ImagePlus size={18} />}
                        {isReadingImage ? "Reading images..." : "Choose QR codes from gallery"}
                    </button>
                    <button className="btn btn-circle btn-ghost mt-3 text-white" onClick={onClose}>
                        <X size={32} />
                    </button>
                </div>
            )}

            {scanError && (
                <div className="fixed bottom-4 max-w-md rounded-md bg-error/20 p-3 text-center text-error">
                    <p className="font-semibold">Scanner Error</p>
                    <p className="text-sm">{scanError}</p>
                </div>
            )}
        </div>
    );
}