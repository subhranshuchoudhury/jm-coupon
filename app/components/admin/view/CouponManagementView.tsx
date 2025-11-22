"use client";

import { createOrUpdateCoupon, deleteCoupon, fetchCoupons } from "@/apis/api";
import { Coupon, PocketBaseCoupon } from "@/app/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2, QrCode, Upload, Download, Search, Eye, EyeOff, Share2, FileSpreadsheet, CheckCircle, XCircle, Loader2, RefreshCcw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Pagination from "../../Pagination";
import QRScannerModal from "../../QRScannerModal";
import pb from "@/lib/pocketbase";
import * as XLSX from 'xlsx';
import { formatDate } from "@/utils";
import UserAvatar from "../UserAvatar";
import CouponCodeDisplay from "./CouponCodeDisplay";
import QRCode from "react-qr-code";

// ... [Keep QRShareModal component exactly as is] ...
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
            const svg = document.getElementById("coupon-qr-code");
            if (!svg) throw new Error("QR Code element not found");

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();
            const scaleFactor = 3;
            const baseWidth = 400;
            const baseHeight = 500;
            const baseQrSize = 280;
            const baseQrY = 100;
            const canvasWidth = baseWidth * scaleFactor;
            const canvasHeight = baseHeight * scaleFactor;
            const qrSize = baseQrSize * scaleFactor;
            const qrY = baseQrY * scaleFactor;
            const centerX = canvasWidth / 2;
            const qrX = (canvasWidth - qrSize) / 2;

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            img.onload = async () => {
                if (!ctx) return;
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.textAlign = "center";
                const setFont = (size: number, weight = "bold") => {
                    ctx.font = `${weight} ${size * scaleFactor}px sans-serif`;
                };
                ctx.fillStyle = "#666666";
                setFont(16, "normal");
                ctx.fillText("✨🎊 Congratulations! 🎊✨", centerX, 28 * scaleFactor);
                ctx.fillStyle = "#000000";
                setFont(32, "bold");
                ctx.fillText("Here is your coupon!", centerX, 65 * scaleFactor);
                ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
                const footerStartY = qrY + qrSize;
                ctx.fillStyle = "#000000";
                setFont(18, "bold");
                ctx.fillText("Thanks for buying from", centerX, footerStartY + (40 * scaleFactor));
                ctx.fillStyle = "#D32F2F";
                setFont(24, "bold");
                ctx.fillText("Jyeshtha Motors", centerX, footerStartY + (70 * scaleFactor));
                canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    const file = new File([blob], `coupon-${code}.png`, { type: "image/png" });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                title: 'Jyeshtha Motors Coupon',
                                text: `Here is your coupon code: ${code}. Thanks for buying from Jyeshtha Motors!`,
                                files: [file],
                            });
                        } catch (err) {
                            console.log("Share cancelled", err);
                        }
                    } else {
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `coupon-${code}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        alert("Image downloaded.");
                    }
                    setIsSharing(false);
                }, "image/png");
            };
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
                    {code && (
                        <QRCode
                            id="coupon-qr-code"
                            value={code}
                            size={200}
                            level="H"
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

// --- NEW: Types for Individual Upload ---
type UploadMode = 'batch' | 'individual';
type UploadStatus = 'pending' | 'processing' | 'success' | 'failed';
type IndividualUploadRecord = {
    code: string;
    status: UploadStatus;
    message: string;
};

export default function CouponManagementView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

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

    // --- NEW: State for Individual Uploads ---
    const [uploadMode, setUploadMode] = useState<UploadMode>('batch');
    const [individualStatuses, setIndividualStatuses] = useState<IndividualUploadRecord[]>([]);
    const [isIndividualComplete, setIsIndividualComplete] = useState(false);

    const [exportBatchSize, setExportBatchSize] = useState<number | string>(500);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['coupons', currentPage, searchQuery],
        queryFn: () => fetchCoupons(currentPage, searchQuery),
        refetchInterval: 10000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

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

    // --- NEW: Individual Mutation with Retry ---
    const individualMutate = useMutation({
        mutationFn: createOrUpdateCoupon,
        retry: 1, // Retry 1 times on error
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
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
        setUploadMode('batch'); // Reset to default
        setIndividualStatuses([]);
        setIsIndividualComplete(false);
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
            setIndividualStatuses([]);
            setIsIndividualComplete(false);
        }
    };

    const prepareDataFromExcel = async (): Promise<Partial<PocketBaseCoupon>[]> => {
        if (!selectedFile) throw new Error("No file selected");

        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: ParsedCouponRow[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) throw new Error("The file is empty or in the wrong format.");

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
        return couponsToCreate;
    }

    const handleBulkUpload = async () => {
        if (!selectedFile) {
            setProcessingError("Please select a file first.");
            return;
        }

        setIsProcessing(true);
        setProcessingError(null);
        setSuccessMessage(null);

        try {
            const couponsToCreate = await prepareDataFromExcel();

            if (uploadMode === 'batch') {
                // --- BATCH UPLOAD LOGIC ---
                setSuccessMessage(`Processing ${couponsToCreate.length} coupons...`);
                const batch = pb.createBatch();
                couponsToCreate.map(couponData => batch.collection('coupons').create(couponData));
                const results = await batch.send();
                const successfulUploads = results.filter(r => r.status === 200).length;
                const failedUploads = results.filter(r => r.status !== 200).map(r => ({ status: "rejected", reason: r.body.code }));

                if (failedUploads.length > 0) {
                    setProcessingError(`Uploaded ${successfulUploads} coupons, but ${failedUploads.length} failed.`);
                    setSuccessMessage(null);
                } else {
                    setSuccessMessage(`Successfully uploaded ${successfulUploads} coupons!`);
                    queryClient.invalidateQueries({ queryKey: ['coupons'] });
                    // Close modal after short delay if successful
                    setTimeout(() => {
                        handleCloseBulkModal();
                    }, 1500);
                }
            } else {
                // --- INDIVIDUAL UPLOAD LOGIC ---
                handleIndividualUpload(couponsToCreate);
                // Note: isProcessing is handled inside handleIndividualUpload
                return;
            }

        } catch (err: any) {
            setProcessingError(`Error: ${err.message}`);
            setSuccessMessage(null);
        } finally {
            if (uploadMode === 'batch') {
                setIsProcessing(false);
            }
        }
    };

    // --- NEW: Handler for Individual Upload Loop ---
    const handleIndividualUpload = async (coupons: Partial<PocketBaseCoupon>[]) => {
        // 1. Initialize State
        const initialStatus: IndividualUploadRecord[] = coupons.map(c => ({
            code: c.code!,
            status: 'pending',
            message: '',
        }));
        setIndividualStatuses(initialStatus);
        setIsIndividualComplete(false);

        // 2. Loop
        let successCount = 0;

        // We iterate using a standard loop to await each mutation sequentially
        for (let i = 0; i < coupons.length; i++) {
            const couponData = coupons[i];

            // Update status to processing
            setIndividualStatuses(prev => {
                const newArr = [...prev];
                newArr[i] = { ...newArr[i], status: 'processing', message: 'Creating...' };
                return newArr;
            });

            try {
                // React Query mutateAsync (handles configured retries automatically)
                await individualMutate.mutateAsync({ id: 'new', data: couponData });

                // Update success
                setIndividualStatuses(prev => {
                    const newArr = [...prev];
                    newArr[i] = { ...newArr[i], status: 'success', message: 'Created' };
                    return newArr;
                });
                successCount++;
            } catch (err: any) {
                // Update failure
                const errMsg = err?.data?.message || err.message || "Unknown error";
                // Extract cleaner error if possible (e.g. unique constraint)
                const cleanMsg = JSON.stringify(err?.data?.data) || errMsg;

                setIndividualStatuses(prev => {
                    const newArr = [...prev];
                    newArr[i] = { ...newArr[i], status: 'failed', message: cleanMsg };
                    return newArr;
                });
            }
        }

        setIsIndividualComplete(true);
        setIsProcessing(false);
        setSuccessMessage(`Completed. ${successCount}/${coupons.length} successful.`);
        queryClient.invalidateQueries({ queryKey: ['coupons'] });
    };

    // --- NEW: Generate Report ---
    const handleDownloadReport = () => {
        if (individualStatuses.length === 0) return;

        const dataToExport = individualStatuses.map(item => ({
            'Code': item.code,
            'Result': item.status.toUpperCase(),
            'Message': item.message
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Upload Report');
        const dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        XLSX.writeFile(wb, `upload_report_${dateStr}.xlsx`);
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
            <QRShareModal code={qrShareCode} onClose={() => setQrShareCode(null)} />

            {/* ... [Header and Search Bar code remains exactly as is] ... */}
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

            {/* ... [Table code remains exactly as is] ... */}
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
                                                    <button
                                                        className="btn btn-sm btn-ghost text-secondary join-item tooltip tooltip-top"
                                                        data-tip="Share QR Code"
                                                        onClick={() => setQrShareCode(coupon.code)}
                                                    >
                                                        <QrCode size={16} />
                                                    </button>
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

            {/* ... [Coupon Edit Modal remains exactly as is] ... */}
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


            {/* Bulk Upload Modal - MODIFIED */}
            <dialog id="bulk_upload_modal" className="modal">
                <div className="modal-box w-11/12 max-w-4xl">
                    <h3 className="font-bold text-lg">Bulk Upload Coupons</h3>
                    <div className="py-4 space-y-4">

                        {/* 1. Toggle Upload Type */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold">Upload Type</span>
                            </label>
                            <div className="flex gap-4">
                                <label className="label cursor-pointer justify-start gap-2 border p-3 rounded-lg border-base-300 flex-1">
                                    <input
                                        type="radio"
                                        name="upload_mode"
                                        className="radio radio-primary"
                                        checked={uploadMode === 'batch'}
                                        onChange={() => setUploadMode('batch')}
                                        disabled={isProcessing}
                                    />
                                    <div className="flex flex-col">
                                        <span className="label-text font-bold">Batch Upload</span>
                                        <span className="label-text text-xs opacity-70">Faster. All or nothing (transactional).</span>
                                    </div>
                                </label>
                                <label className="label cursor-pointer justify-start gap-2 border p-3 rounded-lg border-base-300 flex-1">
                                    <input
                                        type="radio"
                                        name="upload_mode"
                                        className="radio radio-primary"
                                        checked={uploadMode === 'individual'}
                                        onChange={() => setUploadMode('individual')}
                                        disabled={isProcessing}
                                    />
                                    <div className="flex flex-col">
                                        <span className="label-text font-bold">Individual Upload</span>
                                        <span className="label-text text-xs opacity-70">Slower. Process 1-by-1 with retries & detailed report.</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="divider"></div>

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

                        <div className="alert alert-warning shadow-lg text-sm">
                            The file should contain columns: code (unique), company(lower case), and mrp(number). You can add a 'points' column to override the automatic calculation.
                        </div>
                        <div className="alert alert-info shadow-lg text-sm">
                            Note: Use "Batch Upload" when you know the coupons are unique and are not present in the database. Use "Individual Upload" when you are not sure, want to visualize the progress & detailed error. While use "Individual Upload", upload a max of 100 coupons at a time.
                        </div>

                        {/* --- Batch Mode Feedback --- */}
                        {uploadMode === 'batch' && (
                            <>
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
                            </>
                        )}

                        {/* --- Individual Mode Feedback (Table) --- */}
                        {uploadMode === 'individual' && individualStatuses.length > 0 && (
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold">Progress</h4>
                                    {isIndividualComplete && (
                                        <button className="btn btn-sm btn-outline btn-success gap-2" onClick={handleDownloadReport}>
                                            <FileSpreadsheet size={16} /> Download Report
                                        </button>
                                    )}
                                </div>
                                <div className="overflow-x-auto border rounded-lg h-64 overflow-y-auto relative bg-base-200/30">
                                    <table className="table table-xs table-pin-rows w-full">
                                        <thead>
                                            <tr>
                                                <th>Code</th>
                                                <th>Status</th>
                                                <th>Message</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {individualStatuses.map((item, idx) => (
                                                <tr key={idx} className={
                                                    item.status === 'failed' ? 'bg-error/10' :
                                                        item.status === 'success' ? 'bg-success/10' :
                                                            item.status === 'processing' ? 'bg-info/10' : ''
                                                }>
                                                    <td className="font-mono font-bold">{item.code}</td>
                                                    <td>
                                                        {item.status === 'pending' && <span className="badge badge-ghost badge-xs">Pending</span>}
                                                        {item.status === 'processing' && <span className="badge badge-info badge-xs gap-1"><Loader2 size={10} className="animate-spin" /> Processing</span>}
                                                        {item.status === 'success' && <span className="badge badge-success badge-xs gap-1"><CheckCircle size={10} /> Success</span>}
                                                        {item.status === 'failed' && <span className="badge badge-error badge-xs gap-1"><XCircle size={10} /> Failed</span>}
                                                    </td>
                                                    <td className="max-w-xs truncate" title={item.message}>
                                                        {item.message}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {processingError && (
                                    <div className="alert alert-error mt-2 text-sm">
                                        <span className="font-bold">Setup Error:</span> {processingError}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                    <div className="modal-action">
                        <button type="button" className="btn btn-ghost" onClick={handleCloseBulkModal} disabled={isProcessing}>
                            Close
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleBulkUpload}
                            disabled={!selectedFile || isProcessing || (uploadMode === 'individual' && isIndividualComplete)}
                        >
                            {isProcessing ? 'Processing...' : uploadMode === 'batch' ? 'Upload Batch' : 'Start Upload'}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={handleCloseBulkModal}>close</button>
                </form>
            </dialog>

            {/* ... [Export Modal & Delete Modal remain exactly as is] ... */}
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

            {isScannerOpen && (
                <QRScannerModal
                    onClose={() => setIsScannerOpen(false)}
                    onScan={handleScanComplete}
                />
            )}

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