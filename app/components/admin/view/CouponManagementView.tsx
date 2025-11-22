"use client";

import { createOrUpdateCoupon, deleteCoupon, fetchCoupons } from "@/apis/api";
import { Coupon, PocketBaseCoupon } from "@/app/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2, QrCode, Upload, Download, Search, Eye, EyeOff, Share2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Pagination from "../../Pagination";
import QRScannerModal from "../../QRScannerModal";
import pb from "@/lib/pocketbase";
import * as XLSX from 'xlsx';
import { formatDate } from "@/utils";
import UserAvatar from "../UserAvatar";
import CouponCodeDisplay from "./CouponCodeDisplay";
// --- NEW: Import QR Code Package ---
import QRCode from "react-qr-code";

// --- NEW COMPONENT: QR Share Modal ---
const QRShareModal = ({ code, onClose }: { code: string | null, onClose: () => void }) => {
    const modalRef = useRef<HTMLDialogElement>(null);
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        if (code) {
            modalRef.current?.showModal();
        } else {
            modalRef.current?.close();
        }
    }, [code]);

    const handleShare = async () => {
        if (!code) return;
        setIsSharing(true);

        try {
            // 1. Get the SVG element
            const svg = document.getElementById("coupon-qr-code");
            if (!svg) throw new Error("QR Code element not found");

            // 2. Create a Canvas
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();

            // --- CONFIGURATION ---
            const canvasSize = 300; // Increased slightly for better resolution
            const padding = 25;     // The amount of white space (padding) around the QR
            // ---------------------

            canvas.width = canvasSize;
            canvas.height = canvasSize;

            img.onload = async () => {
                if (ctx) {
                    // A. Draw the white background over the ENTIRE canvas
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0, 0, canvasSize, canvasSize);

                    // B. Draw the QR Code Image with padding
                    // We start at (padding, padding)
                    // We make the width/height smaller by (padding * 2) to fit inside
                    ctx.drawImage(
                        img,
                        padding,
                        padding,
                        canvasSize - (padding * 2),
                        canvasSize - (padding * 2)
                    );

                    // 3. Convert canvas to blob
                    canvas.toBlob(async (blob) => {
                        if (!blob) return;
                        const file = new File([blob], `coupon-${code}.png`, { type: "image/png" });

                        // 4. Use Web Share API if available
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({
                                    title: 'Coupon QR Code',
                                    text: `Here is your coupon code: ${code}`,
                                    files: [file],
                                });
                            } catch (err) {
                                console.log("Share cancelled or failed", err);
                            }
                        } else {
                            // Fallback: Download
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `coupon-${code}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            alert("Image downloaded (Sharing not supported on this browser).");
                        }
                        setIsSharing(false);
                    }, "image/png");
                }
            };

            // Handle loading the SVG source
            // Using encodeURIComponent is often safer than btoa for SVGs with special characters
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);

        } catch (error) {
            console.error("Error generating image:", error);
            setIsSharing(false);
        }
    };

    return (
        <dialog ref={modalRef} className="modal">
            <div className="modal-box flex flex-col items-center text-center">
                <h3 className="font-bold text-lg mb-4">Share Coupon QR</h3>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-base-200 mb-4">
                    {/* Render the QR Code */}
                    {code && (
                        <QRCode
                            id="coupon-qr-code"
                            value={code}
                            size={200}
                            level="H" // High error correction
                        />
                    )}
                </div>

                <p className="font-mono text-xl font-bold mb-6 text-primary">{code}</p>

                <div className="modal-action w-full flex justify-center gap-2">
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                    <button
                        className="btn btn-primary gap-2"
                        onClick={handleShare}
                        disabled={isSharing}
                    >
                        {isSharing ? <span className="loading loading-spinner loading-xs"></span> : <Share2 size={18} />}
                        Share Image
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};
// --- END NEW COMPONENT ---


// Helper function to show the modal by its ID
const showModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.showModal();
const closeModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.close();

type ParsedCouponRow = {
    code?: string;
    mrp?: number;
    company?: string;
    points?: number;
};

type CompanyData = {
    id: string;
    name: string;
    conversion_factor: number;
};

export default function CouponManagementView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // --- NEW: State for QR Share Modal ---
    const [qrShareCode, setQrShareCode] = useState<string | null>(null);

    const [couponCodeInput, setCouponCodeInput] = useState<string>('');
    const [pointsInput, setPointsInput] = useState<number | string>('');
    const [mrpInput, setMrpInput] = useState<number | string>('');
    const [companyInput, setCompanyInput] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [exportBatchSize, setExportBatchSize] = useState<number | string>(500);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch coupons data
    const { data, isLoading, isError } = useQuery({
        queryKey: ['coupons', currentPage, searchQuery],
        queryFn: () => fetchCoupons(currentPage, searchQuery),
        refetchInterval: 10000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    // Fetch companies data
    const { data: companies, isLoading: isLoadingCompanies } = useQuery({
        queryKey: ['companies'],
        queryFn: async () => {
            const companyList = await pb.collection('companies').getFullList<CompanyData>({
                fields: 'id, name, conversion_factor',
                skipTotal: true,
                sort: 'name',
            });
            return companyList;
        },
        refetchInterval: 10000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    const resetModalState = () => {
        setSelectedCoupon(null);
        setCouponCodeInput('');
        setPointsInput('');
        setMrpInput('');
        setCompanyInput('');
        couponMutate.reset();
    };

    const couponMutate = useMutation({
        mutationFn: createOrUpdateCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            closeModal('coupon_edit_modal');
            resetModalState();
        },
    });

    const couponDeleteMutation = useMutation({
        mutationFn: deleteCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
        },
    });

    const handleOpenModal = (coupon: Coupon, initialCode = '') => {
        couponMutate.reset();
        setSelectedCoupon(coupon);
        setCouponCodeInput(initialCode || coupon.code);
        setPointsInput(coupon.points);
        setMrpInput(coupon.mrp || '');
        setCompanyInput(coupon.company || '');
        showModal('coupon_edit_modal');
    }

    const handleEditClick = (coupon: Coupon) => {
        handleOpenModal(coupon);
    };

    const handleDeleteClick = (coupon: Coupon) => {
        setCouponToDelete(coupon);
        (document.getElementById('delete_confirmation_modal_coupon') as HTMLDialogElement)?.showModal();
    };

    const confirmDelete = () => {
        if (couponToDelete) {
            couponDeleteMutation.mutate(couponToDelete.id);
            setCouponToDelete(null);
            (document.getElementById('delete_confirmation_modal_coupon') as HTMLDialogElement)?.close();
        }
    };

    const handleCreateNew = (initialCode = '') => {
        const newCoupon: Coupon = {
            id: 'new',
            code: initialCode,
            points: 0,
            mrp: 0,
            company: '',
            redeemed: false,
        };
        handleOpenModal(newCoupon, initialCode);
        setPointsInput('');
        setMrpInput('');
        setCompanyInput('');
    }

    const handleScanComplete = (result: string) => {
        setIsScannerOpen(false);
        handleCreateNew(result.trim());
    }

    const calculatePoints = (mrpVal: string | number, companyId: string) => {
        if (!companyId || !mrpVal) return;

        const company = companies?.find(c => c.id === companyId);
        if (!company) return;

        const mrpNum = parseFloat(mrpVal.toString());
        if (isNaN(mrpNum) || mrpNum <= 0) {
            setPointsInput(0);
            return;
        }

        const calculatedPoints = Math.round((mrpNum * company.conversion_factor) / 100);
        setPointsInput(calculatedPoints);
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCompanyId = e.target.value;
        setCompanyInput(newCompanyId);
        calculatePoints(mrpInput, newCompanyId);
    };

    const handleMrpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMrp = e.target.value;
        setMrpInput(newMrp);
        calculatePoints(newMrp, companyInput);
    };


    const handleModalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCoupon) return;

        const pointsNum = parseInt(pointsInput.toString(), 10);
        const mrpNum = parseFloat(mrpInput.toString()) || 0;

        if (isNaN(pointsNum) || pointsNum < 1) return;

        const data: Partial<PocketBaseCoupon> = {
            code: couponCodeInput,
            points: pointsNum,
            mrp: mrpNum,
            company: companyInput || "",
        };

        couponMutate.mutate({ id: selectedCoupon.id, data });
    };

    const getUsesBadge = (status: Coupon['redeemed']) => {
        switch (status) {
            case true: return <span className="badge badge-error">Redeemed</span>;
            case false:
            default: return <span className="badge badge-success">Available</span>;
        }
    }

    // --- Bulk Upload Functions ---
    const resetBulkModalState = () => {
        setSelectedFile(null);
        setIsProcessing(false);
        setProcessingError(null);
        setSuccessMessage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    const handleOpenBulkModal = () => {
        resetBulkModalState();
        showModal('bulk_upload_modal');
    }

    const handleCloseBulkModal = () => {
        closeModal('bulk_upload_modal');
        resetBulkModalState();
    }

    const handleDownloadSample = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "code,company,mrp,points\n"
            + "BULK-COUPON-01,tgp,100,\n"
            + "BULK-COUPON-02,tgp,500,50\n"
            + "MY-CODE,lumax,250,";

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "coupons_sample.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setProcessingError(null);
            setSuccessMessage(null);
        }
    };

    const handleBulkUpload = async () => {
        if (!selectedFile) {
            setProcessingError("Please select a file first.");
            return;
        }

        setIsProcessing(true);
        setProcessingError(null);
        setSuccessMessage(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: ParsedCouponRow[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    throw new Error("The file is empty or in the wrong format.");
                }

                const companyList = companies || await pb.collection('companies').getFullList<CompanyData>({
                    page: 1,
                    perPage: 500,
                    fields: 'id, name, conversion_factor',
                    skipTotal: true,
                });

                const validationErrors: string[] = [];
                const couponsToCreate: Partial<PocketBaseCoupon>[] = [];

                json.forEach((row, index) => {
                    const rowNum = index + 2;
                    const code = row.code?.toString().trim();
                    const mrp = parseInt(row.mrp?.toString() || '', 10);
                    const company = row.company?.toString().trim().toLowerCase();
                    const overridePoints = row.points ? parseInt(row.points.toString(), 10) : null;

                    if (!code) validationErrors.push(`Row ${rowNum}: 'code' is missing or empty.`);
                    if (isNaN(mrp) || mrp < 1) validationErrors.push(`Row ${rowNum}: 'mrp' must be a number greater than 0.`);
                    if (!company) validationErrors.push(`Row ${rowNum}: 'company' is missing or empty.`);

                    if (code && !isNaN(mrp) && mrp >= 1 && company) {
                        const companyData = companyList.find(c => c.name.toLowerCase() === company)

                        if (!companyData) {
                            validationErrors.push(`Row ${rowNum}: 'company' "${company}" does not exist in the system.`);
                            return;
                        }

                        let finalPoints = 0;
                        if (overridePoints && !isNaN(overridePoints) && overridePoints > 0) {
                            finalPoints = overridePoints;
                        } else {
                            finalPoints = Math.round(((mrp) * (companyData?.conversion_factor || 0)) / 100);
                        }

                        couponsToCreate.push({
                            code,
                            mrp,
                            points: finalPoints,
                            company: companyData?.id,
                        });
                    }
                });

                if (validationErrors.length > 0) {
                    throw new Error(validationErrors.join('\n'));
                }

                setSuccessMessage(`Processing ${couponsToCreate.length} coupons...`);
                const batch = pb.createBatch();
                couponsToCreate.map(couponData => batch.collection('coupons').create(couponData));
                const results = await batch.send();
                const successfulUploads = results.filter(r => r.status === 200).length;
                const failedUploads = results.filter(r => r.status !== 200).map(r => ({ status: "rejected", reason: r.body.code })) as PromiseRejectedResult[];

                if (failedUploads.length > 0) {
                    setProcessingError(`Uploaded ${successfulUploads} coupons, but ${failedUploads.length} failed.`);
                    setSuccessMessage(null);
                } else {
                    setSuccessMessage(`Successfully uploaded ${successfulUploads} coupons!`);
                    queryClient.invalidateQueries({ queryKey: ['coupons'] });
                    handleCloseBulkModal();
                }

            } catch (err: any) {
                setProcessingError(`Error: ${err.message} Detailed: ${JSON.stringify(err?.data?.data?.requests || err)}`);
                setSuccessMessage(null);
            } finally {
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
            setProcessingError("Failed to read the file.");
            setIsProcessing(false);
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    // --- Export Functions ---
    const handleOpenExportModal = () => {
        setExportBatchSize(500);
        setIsExporting(false);
        setExportError(null);
        showModal('export_excel_modal');
    };

    const handleCloseExportModal = () => {
        closeModal('export_excel_modal');
        setIsExporting(false);
        setExportError(null);
    };

    const handleExport = async () => {
        setIsExporting(true);
        setExportError(null);

        const batchNum = parseInt(exportBatchSize.toString(), 10);
        if (isNaN(batchNum) || batchNum < 500) {
            setExportError("Batch size must be a number with least value 500.");
            setIsExporting(false);
            return;
        }

        try {
            type ExpandedCouponRecord = PocketBaseCoupon & {
                expand?: {
                    company?: CompanyData;
                    redeemed_by?: { id: string; name: string; email: string; phone: string; }
                }
            }

            const records = await pb.collection('coupons').getFullList<ExpandedCouponRecord>({
                batch: batchNum,
                sort: '-created',
                expand: 'company,redeemed_by',
                requestKey: null
            });

            if (records.length === 0) {
                setExportError("No coupons found to export.");
                setIsExporting(false);
                return;
            }

            const dataToExport = records.map(coupon => ({
                'code': coupon.code,
                'company': coupon.expand?.company?.name || coupon.company,
                'mrp': coupon.mrp,
                'points': coupon.points,
                'status': coupon.redeemed ? 'Redeemed' : 'Available',
                'redeemed by name': coupon.expand?.redeemed_by?.name || '',
                'redeemed by email': coupon.expand?.redeemed_by?.email || '',
                'redeemed by phone': coupon.expand?.redeemed_by?.phone || '',
                'redeemed on': coupon.timestamp ? formatDate(coupon?.timestamp) : '',
                'created at': formatDate(coupon.created),
                'last updated': formatDate(coupon.updated),
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Coupons');
            const dateStr = new Date().toLocaleString().replaceAll(" ", "_").replaceAll(",", "_").toUpperCase();
            XLSX.writeFile(wb, `coupons_export_${dateStr}_bs_${batchNum}.xlsx`);

            setIsExporting(false);
            handleCloseExportModal();

        } catch (err: any) {
            setExportError(err.message || 'An unknown error occurred during export.');
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* --- NEW: QR Share Modal Component --- */}
            <QRShareModal code={qrShareCode} onClose={() => setQrShareCode(null)} />

            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h1 className="text-3xl font-bold hidden lg:block">Coupon Management 🎫</h1>
                <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-neutral gap-2" onClick={handleOpenBulkModal}>
                        <Upload size={18} /> Bulk Upload
                    </button>
                    <button className="btn btn-success gap-2" onClick={handleOpenExportModal}>
                        <Download size={18} /> Export Excel
                    </button>
                    <button className="btn btn-secondary gap-2" onClick={() => setIsScannerOpen(true)}>
                        <QrCode size={18} /> Scan QR Code
                    </button>
                    <button className="btn btn-primary gap-2" onClick={() => handleCreateNew()}>
                        <Plus size={18} /> Create New Coupon
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="form-control w-full max-w-xs">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by code..."
                        className="input input-bordered w-full pr-10"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-base-content/50">
                        <Search size={18} />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        {isLoading && !data ? (
                            <div className="flex justify-center items-center h-64">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : isError || !data ? (
                            <div className="text-error text-center p-8">Error loading coupons. Please check your PocketBase connection.</div>
                        ) : (
                            <table className="table w-full">
                                <thead>
                                    <tr className="border-b border-base-content/10">
                                        <th className="py-3 px-4 text-left whitespace-nowrap">
                                            <div onClick={() => setIsVisible(!isVisible)} className="flex items-center gap-2">
                                                <span>Code</span>
                                                <button className="btn btn-ghost btn-xs btn-circle">
                                                    {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 text-left">Company</th>
                                        <th className="py-3 px-4 text-right whitespace-nowrap">MRP</th>
                                        <th className="py-3 px-4 text-right whitespace-nowrap">Points Value</th>
                                        <th className="py-3 px-4 text-left whitespace-nowrap">Status</th>
                                        <th className="py-3 px-4 text-left">Redeemed By</th>
                                        <th className="py-3 px-4 text-left">Redeemed On</th>
                                        <th className="py-3 px-4 text-left whitespace-nowrap">Created</th>
                                        <th className="py-3 px-4 text-left whitespace-nowrap">Updated</th>
                                        <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map(coupon => (
                                        <tr key={coupon.id} className="hover">
                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <CouponCodeDisplay code={coupon.code} globalVisible={isVisible} />
                                                    {/* --- NEW: Share QR Button --- */}
                                                    <button
                                                        className="btn btn-sm btn-ghost text-secondary join-item tooltip tooltip-top"
                                                        data-tip="Share QR Code"
                                                        onClick={() => setQrShareCode(coupon.code)}
                                                    >
                                                        <QrCode size={16} />
                                                    </button>
                                                    {/* --- END NEW --- */}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 align-middle">
                                                {coupon.companyName || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-right align-middle whitespace-nowrap">
                                                {coupon.mrp?.toLocaleString() || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-right align-middle whitespace-nowrap">
                                                {coupon.points.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                {getUsesBadge(coupon.redeemed)}
                                            </td>
                                            <td className="py-3 px-4 align-middle">
                                                {coupon.redeemed_by ? (
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar user={coupon.redeemed_by} size={36} />
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">{coupon.redeemed_by.name}</span>
                                                            <span className="text-xs text-base-content/70">{coupon.redeemed_by.email}</span>
                                                            <span className="text-xs text-base-content/70">{coupon.redeemed_by.phone}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-base-content/70">N/A</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                {coupon.timestamp ? formatDate(coupon.timestamp) : "N/A"}
                                            </td>
                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                {coupon.created && formatDate(coupon.created)}
                                            </td>
                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                {coupon.updated && formatDate(coupon.updated)}
                                            </td>
                                            <td className="py-3 px-4 align-middle whitespace-nowrap text-right">
                                                <div className="join">
                                                    <button
                                                        className="btn btn-sm btn-ghost join-item tooltip tooltip-top"
                                                        data-tip="Edit Coupon"
                                                        onClick={() => handleEditClick(coupon)}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-ghost text-error join-item tooltip tooltip-top"
                                                        data-tip="Delete Coupon"
                                                        onClick={() => handleDeleteClick(coupon)}
                                                        disabled={couponDeleteMutation.isPending}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {data && (
                        <div className="p-4 border-t border-base-content/10">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={data.totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Coupon Edit/Create Modal */}
            <dialog id="coupon_edit_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">
                        {selectedCoupon?.id === 'new' ? 'Create New Coupon' : `Edit Coupon: ${selectedCoupon?.code}`}
                    </h3>
                    {(couponMutate.isPending || couponMutate.isSuccess || couponMutate.isError) && (
                        <div className={`alert ${couponMutate.isSuccess ? 'alert-success' : couponMutate.isError ? 'alert-error' : 'alert-info'} my-2`}>
                            {couponMutate.isSuccess
                                ? 'Coupon saved successfully! Closing...'
                                : couponMutate.isError
                                    ? `Error: ${(couponMutate.error as Error).message}`
                                    : 'Saving changes...'
                            }
                        </div>
                    )}
                    <form onSubmit={handleModalSubmit} className="space-y-4 pt-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Coupon Code</span></label>
                            <input
                                type="text"
                                name="code"
                                value={couponCodeInput}
                                className="input input-bordered font-mono w-full"
                                required
                                onChange={(e) => setCouponCodeInput(e.target.value)}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label"><span className="label-text">Company</span></label>
                            <select
                                name="company"
                                className="select select-bordered w-full"
                                value={companyInput}
                                onChange={handleCompanyChange}
                                disabled={isLoadingCompanies}
                            >
                                <option value="">{isLoadingCompanies ? 'Loading companies...' : 'Select a company'}</option>
                                {companies?.map(company => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-control">
                            <label className="label"><span className="label-text">MRP</span></label>
                            <input
                                type="number"
                                name="mrp"
                                value={mrpInput}
                                className="input input-bordered w-full"
                                min="0"
                                step="0.01"
                                onChange={handleMrpChange}
                                placeholder="e.g., 100"
                            />
                        </div>
                        <div className="form-control">
                            <label className="label"><span className="label-text">Points Value</span></label>
                            <input
                                type="number"
                                name="points"
                                value={pointsInput}
                                className="input input-bordered w-full"
                                required
                                min="1"
                                onChange={(e) => setPointsInput(e.target.value)}
                            />
                        </div>
                        <div className="alert alert-info shadow-lg text-sm">
                            Points are calculated automatically from MRP and Company. You can still set the points value manually.
                        </div>
                        <div className="modal-action">
                            <button type="button" className="btn btn-ghost" onClick={() => {
                                closeModal('coupon_edit_modal');
                                resetModalState();
                            }}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" type="submit" disabled={couponMutate.isPending}>
                                Save
                            </button>
                        </div>
                    </form>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={resetModalState}>close</button>
                </form>
            </dialog>

            {/* Bulk Upload Modal */}
            <dialog id="bulk_upload_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Bulk Upload Coupons</h3>
                    <div className="py-4 space-y-4">
                        <p className="text-sm">
                            Upload an Excel (<code>.xlsx</code>) or CSV (<code>.csv</code>) file.
                        </p>
                        <button className="btn btn-sm btn-outline" onClick={handleDownloadSample}>
                            Download Sample .csv File
                        </button>
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text">Upload File</span>
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="file-input file-input-bordered w-full"
                                accept=".xlsx, .csv"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                            />
                        </div>
                        <div className="alert alert-info shadow-lg text-sm">
                            The file should contain columns: code (unique), company(lower case), and mrp(number). You can add a 'points' column to override the automatic calculation.
                        </div>
                        {isProcessing && (
                            <div className="alert alert-info">
                                <span className="loading loading-spinner loading-sm"></span>
                                {successMessage || "Processing file... Please wait."}
                            </div>
                        )}
                        {successMessage && !isProcessing && (
                            <div className="alert alert-success">
                                {successMessage}
                            </div>
                        )}
                        {processingError && (
                            <div className="alert alert-error">
                                <span className="font-bold">Error:</span>
                                <pre className="whitespace-pre-wrap">{processingError}</pre>
                            </div>
                        )}
                    </div>
                    <div className="modal-action">
                        <button type="button" className="btn btn-ghost" onClick={handleCloseBulkModal} disabled={isProcessing}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleBulkUpload}
                            disabled={!selectedFile || isProcessing}
                        >
                            {isProcessing ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={handleCloseBulkModal}>close</button>
                </form>
            </dialog>

            {/* Export Excel Modal */}
            <dialog id="export_excel_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Export Coupons to Excel</h3>
                    <div className="py-4 space-y-4">
                        <p className="text-sm">
                            This will retrieve the most recent coupon records, with the number of records determined by the batch size (default is 500).
                        </p>
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text">Batch Size</span>
                            </label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                value={exportBatchSize}
                                onChange={(e) => setExportBatchSize(e.target.value)}
                                min="100"
                                max="5000"
                                step="100"
                                disabled={isExporting}
                            />
                        </div>
                        {isExporting && (
                            <div className="alert alert-info">
                                <span className="loading loading-spinner loading-sm"></span>
                                Fetching and processing records... Please wait.
                            </div>
                        )}
                        {exportError && (
                            <div className="alert alert-error">
                                <span className="font-bold">Error:</span>
                                <pre className="whitespace-pre-wrap">{exportError}</pre>
                            </div>
                        )}
                    </div>
                    <div className="modal-action">
                        <button type="button" className="btn btn-ghost" onClick={handleCloseExportModal} disabled={isExporting}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? 'Exporting...' : 'Export File'}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={handleCloseExportModal}>close</button>
                </form>
            </dialog>

            {/* QR Scanner Modal */}
            {isScannerOpen && (
                <QRScannerModal
                    onClose={() => setIsScannerOpen(false)}
                    onScan={handleScanComplete}
                />
            )}
            {/* Delete Confirmation Modal */}
            <dialog id="delete_confirmation_modal_coupon" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg text-error">Confirm Deletion</h3>
                    <p className="py-4">
                        Are you absolutely sure you want to delete the coupon **{couponToDelete?.code}**?
                        This action cannot be undone.
                    </p>
                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => (document.getElementById('delete_confirmation_modal_coupon') as HTMLDialogElement)?.close()}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-error"
                            onClick={confirmDelete}
                            disabled={couponDeleteMutation.isPending}
                        >
                            {couponDeleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}