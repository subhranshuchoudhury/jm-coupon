"use client";

import { createOrUpdateCoupon, deleteCoupon, fetchCoupons } from "@/apis/api";
import { Coupon, PocketBaseCoupon } from "@/app/types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2, QrCode, Upload } from "lucide-react"; // --- NEW ---
import { useState, useRef } from "react"; // --- NEW ---
import Pagination from "../../Pagination";
import QRScannerModal from "../../QRScannerModal";
import pb from "@/lib/pocketbase";
import * as XLSX from 'xlsx'; // --- NEW ---


// Helper function to show the modal by its ID
const showModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.showModal();
const closeModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.close();

// --- NEW ---
// Helper type for parsed Excel row
type ParsedCouponRow = {
    code?: string;
    mrp?: number;
    company?: string;
};

export default function CouponManagementView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState<string>('');

    // --- NEW: State for bulk upload ---
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // --- End NEW ---

    // Fetch data using React Query
    const { data, isLoading, isError } = useQuery({
        queryKey: ['coupons', currentPage],
        queryFn: () => fetchCoupons(currentPage),
        placeholderData: keepPreviousData,
    });

    // Mutation for creating/updating coupon
    const couponMutate = useMutation({
        mutationFn: createOrUpdateCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            closeModal('coupon_edit_modal');
            setSelectedCoupon(null);
            setCouponCodeInput(''); // Clear code input state
        },
    });

    // Mutation for deleting coupon
    const couponDeleteMutation = useMutation({
        mutationFn: deleteCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
        },
    });

    const handleOpenModal = (coupon: Coupon, initialCode = '') => {
        couponMutate.reset();
        setSelectedCoupon(coupon);
        // Use initialCode for new, or existing code for edit
        setCouponCodeInput(initialCode || coupon.code);
        showModal('coupon_edit_modal');
    }

    const handleEditClick = (coupon: Coupon) => {
        handleOpenModal(coupon);
    };

    const handleDeleteClick = (coupon: Coupon) => {
        if (window.confirm(`Are you sure you want to delete coupon ${coupon.code}?`)) {
            couponDeleteMutation.mutate(coupon.id);
        }
    };

    const handleCreateNew = (initialCode = '') => {
        const newCoupon: Coupon = { id: 'new', code: initialCode, points: 0, usesStatus: 'available' };
        handleOpenModal(newCoupon, initialCode);
    }

    const handleScanComplete = (result: string) => {
        setIsScannerOpen(false);
        // Ensure the form gets the trimmed code immediately when the modal opens
        handleCreateNew(result.trim());
    }

    const handleModalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCoupon) return;
        const formData = new FormData(e.currentTarget);

        const data: Partial<PocketBaseCoupon> = {
            // Use couponCodeInput from state for the most up-to-date value
            code: couponCodeInput,
            points: parseInt(formData.get('points') as string, 10),
        };

        couponMutate.mutate({ id: selectedCoupon.id, data });
    };

    const getUsesBadge = (status: Coupon['usesStatus']) => {
        switch (status) {
            case 'redeemed': return <span className="badge badge-error">Redeemed</span>;
            case 'available':
            default: return <span className="badge badge-success">Available</span>;
        }
    }

    // --- NEW: Bulk Upload Functions ---

    const resetBulkModalState = () => {
        setSelectedFile(null);
        setIsProcessing(false);
        setProcessingError(null);
        setSuccessMessage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset file input
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
            + "code,company,mrp\n"
            + "BULK-COUPON-01,tgp,100\n"
            + "BULK-COUPON-02,tgp,500\n"
            + "MY-CODE,lumax,250";

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

                const companies = await pb.collection('companies').getFullList<{
                    name: string; conversion_factor: number; id: string;
                }>({
                    page: 1,
                    perPage: 500,
                    fields: 'id, name, conversion_factor',
                    skipTotal: true,
                });

                // --- Validation ---
                const validationErrors: string[] = [];
                const couponsToCreate: Partial<PocketBaseCoupon>[] = [];

                json.forEach((row, index) => {
                    const rowNum = index + 2; // +1 for zero-index, +1 for header row
                    const code = row.code?.toString().trim();
                    const mrp = parseInt(row.mrp?.toString() || '', 10);
                    const company = row.company?.toString().trim().toLowerCase();

                    if (!code) {
                        validationErrors.push(`Row ${rowNum}: 'code' is missing or empty.`);
                    }
                    if (isNaN(mrp) || mrp < 1) {
                        validationErrors.push(`Row ${rowNum}: 'mrp' must be a number greater than 0.`);
                    }

                    if (!company) {
                        validationErrors.push(`Row ${rowNum}: 'company' is missing or empty.`);
                    }

                    if (code && !isNaN(mrp) && mrp >= 1 && company) {

                        const companyData = companies.find(c => c.name.toLowerCase() === company)

                        if (!companyData) {
                            validationErrors.push(`Row ${rowNum}: 'company' "${company}" does not exist in the system.`);
                            return;
                        }

                        couponsToCreate.push({
                            code,
                            company,
                            mrp,
                            points: Math.round(((mrp) * (companyData?.conversion_factor || 0)) / 100),
                            company_id: companyData?.id,
                        });
                    }

                });

                if (validationErrors.length > 0) {
                    throw new Error(validationErrors.join('\n'));
                }

                couponsToCreate.forEach(coupon => {
                    const company = companies.find(c => c.name.toLowerCase() === (coupon.company || '').toLowerCase());
                    if (company && coupon.mrp) {
                        coupon.points = Math.round(((coupon.mrp) * company.conversion_factor) / 100);
                        coupon.company_id = company.id;
                    }
                });

                setSuccessMessage(`Processing ${couponsToCreate.length} coupons...`);

                const batch = pb.createBatch();

                couponsToCreate.map(couponData =>
                    batch.collection('coupons').create(couponData)
                );

                const results = await batch.send();

                const successfulUploads = results.filter(r => r.status === 200).length;
                const failedUploads = results
                    .filter(r => r.status !== 200)
                    .map(r => ({
                        status: "rejected",
                        reason: r.body.code
                    })) as PromiseRejectedResult[];

                if (failedUploads.length > 0) {
                    // Try to get specific failed codes for a better error message
                    setProcessingError(`Uploaded ${successfulUploads} coupons, but ${failedUploads.length} failed.`);
                    setSuccessMessage(null);
                } else {
                    setSuccessMessage(`Successfully uploaded ${successfulUploads} coupons!`);
                    queryClient.invalidateQueries({ queryKey: ['coupons'] });
                    // Close modal on full success
                    setTimeout(() => {
                        handleCloseBulkModal();
                    }, 2000);
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

    // --- End NEW ---

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h1 className="text-3xl font-bold hidden lg:block">Coupon Management 🎫</h1>
                <div className="flex gap-2 flex-wrap">
                    {/* --- NEW: Bulk Upload Button --- */}
                    <button className="btn btn-neutral gap-2" onClick={handleOpenBulkModal}>
                        <Upload size={18} /> Bulk Upload
                    </button>
                    <button className="btn btn-secondary gap-2" onClick={() => setIsScannerOpen(true)}>
                        <QrCode size={18} /> Scan QR Code
                    </button>
                    <button className="btn btn-primary gap-2" onClick={() => handleCreateNew()}>
                        <Plus size={18} /> Create New Coupon
                    </button>
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
                                        <th>Code</th>
                                        <th className="text-right">Points Value</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map(coupon => (
                                        <tr key={coupon.id} className="hover">
                                            <td><span className="font-mono badge badge-neutral p-3 font-semibold">{coupon.code}</span></td>
                                            <td className="font-mono text-right">{coupon.points.toLocaleString()}</td>
                                            <td>
                                                {getUsesBadge(coupon.usesStatus)}
                                            </td>
                                            <td>
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
                    {selectedCoupon && (
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
                                <label className="label"><span className="label-text">Points Value</span></label>
                                <input type="number" name="points" defaultValue={selectedCoupon.points} className="input input-bordered w-full" required min="1" />
                            </div>
                            <div className="alert alert-info shadow-lg text-sm">
                                The coupon code must be unique. Points value must be at least 1.
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={() => {
                                    closeModal('coupon_edit_modal');
                                    setSelectedCoupon(null);
                                    setCouponCodeInput('');
                                }}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" type="submit" disabled={couponMutate.isPending}>
                                    Save
                                </button>
                            </div>
                        </form>
                    )}
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => {
                        setSelectedCoupon(null);
                        setCouponCodeInput('');
                    }}>close</button>
                </form>
            </dialog>

            {/* --- NEW: Bulk Upload Modal --- */}
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

                        {/* --- Feedback Area --- */}
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
                                {/* Use pre-wrap to respect newlines in validation errors */}
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
            {/* --- End NEW --- */}


            {/* Render the QR Scanner Modal conditionally */}
            {isScannerOpen && (
                <QRScannerModal
                    onClose={() => setIsScannerOpen(false)}
                    onScan={handleScanComplete}
                />
            )}
        </div>
    );
}