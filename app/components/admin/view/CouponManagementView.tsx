"use client";

import { createOrUpdateCoupon, deleteCoupon, fetchCoupons } from "@/apis/api";
import { Coupon, PocketBaseCoupon } from "@/app/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2, QrCode, Upload, Download } from "lucide-react";
import { useState, useRef } from "react";
import Pagination from "../../Pagination";
import QRScannerModal from "../../QRScannerModal";
import pb from "@/lib/pocketbase";
import * as XLSX from 'xlsx';
import { formatDate } from "@/utils";
import UserAvatar from "../UserAvatar";
import CouponCodeDisplay from "./CouponCodeDisplay";


// Helper function to show the modal by its ID
const showModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.showModal();
const closeModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.close();

// --- MODIFIED: Added optional points field ---
type ParsedCouponRow = {
    code?: string;
    mrp?: number;
    company?: string;
    points?: number; // Optional override
};
// --- END MODIFIED ---

type CompanyData = {
    id: string;
    name: string;
    conversion_factor: number;
};

export default function CouponManagementView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null); // State for delete modal

    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const [couponCodeInput, setCouponCodeInput] = useState<string>('');
    const [pointsInput, setPointsInput] = useState<number | string>('');
    const [mrpInput, setMrpInput] = useState<number | string>('');
    const [companyInput, setCompanyInput] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- NEW EXPORT LOGIC: State for Export Modal ---
    const [exportBatchSize, setExportBatchSize] = useState<number | string>(500);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    // --- END NEW EXPORT LOGIC ---

    // Fetch coupons data
    const { data, isLoading, isError } = useQuery({
        queryKey: ['coupons', currentPage],
        queryFn: () => fetchCoupons(currentPage),
        refetchInterval: 10000, // Refetch every 10 seconds
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    // --- NEW: Fetch companies data for dropdown ---
    const { data: companies, isLoading: isLoadingCompanies } = useQuery({
        queryKey: ['companies'],
        queryFn: async () => {
            // Re-using logic from your bulk upload to fetch companies
            const companyList = await pb.collection('companies').getFullList<CompanyData>({
                fields: 'id, name, conversion_factor',
                skipTotal: true,
                sort: 'name',
            });
            return companyList;
        },
        refetchInterval: 10000, // Refetch every 10 seconds
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
    // --- END NEW ---

    // Mutation for creating/updating coupon
    const couponMutate = useMutation({
        mutationFn: createOrUpdateCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            closeModal('coupon_edit_modal');
            resetModalState();
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
        // Ensure new coupon has all properties, even if default
        const newCoupon: Coupon = {
            id: 'new',
            code: initialCode,
            points: 0,
            mrp: 0,
            company: '',
            redeemed: false,
        };
        handleOpenModal(newCoupon, initialCode);
        // Set defaults for a new coupon
        setPointsInput('');
        setMrpInput('');
        setCompanyInput('');
    }

    const handleScanComplete = (result: string) => {
        setIsScannerOpen(false);
        handleCreateNew(result.trim());
    }

    // --- NEW: Auto-calculate points ---
    const calculatePoints = (mrpVal: string | number, companyId: string) => {
        if (!companyId || !mrpVal) {
            return; // Not enough info
        }

        const company = companies?.find(c => c.id === companyId);
        if (!company) {
            return; // Company not found
        }

        const mrpNum = parseFloat(mrpVal.toString());
        if (isNaN(mrpNum) || mrpNum <= 0) {
            setPointsInput(0); // Set to 0 if MRP is invalid
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
    // --- END NEW ---


    const handleModalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCoupon) return;

        // --- MODIFIED: Get data from state ---
        const pointsNum = parseInt(pointsInput.toString(), 10);
        const mrpNum = parseFloat(mrpInput.toString()) || 0;

        // Basic validation
        if (isNaN(pointsNum) || pointsNum < 1) {
            return;
        }

        const data: Partial<PocketBaseCoupon> = {
            code: couponCodeInput,
            points: pointsNum,
            mrp: mrpNum,
            company: companyInput || "", // Send null if no company is selected
        };
        // --- END MODIFIED ---

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
        // --- MODIFIED: Added 'points' to sample CSV ---
        const csvContent = "data:text/csv;charset=utf-8,"
            + "code,company,mrp,points\n"
            + "BULK-COUPON-01,tgp,100,\n"
            + "BULK-COUPON-02,tgp,500,50\n"
            + "MY-CODE,lumax,250,";
        // --- END MODIFIED ---

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

                // --- Validation ---
                const validationErrors: string[] = [];
                const couponsToCreate: Partial<PocketBaseCoupon>[] = [];

                json.forEach((row, index) => {
                    const rowNum = index + 2; // +1 for zero-index, +1 for header row
                    const code = row.code?.toString().trim();
                    const mrp = parseInt(row.mrp?.toString() || '', 10);
                    const company = row.company?.toString().trim().toLowerCase();
                    // --- MODIFIED: Check for optional override points ---
                    const overridePoints = row.points ? parseInt(row.points.toString(), 10) : null;
                    // --- END MODIFIED ---

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

                        const companyData = companyList.find(c => c.name.toLowerCase() === company)

                        if (!companyData) {
                            validationErrors.push(`Row ${rowNum}: 'company' "${company}" does not exist in the system.`);
                            return;
                        }

                        // --- MODIFIED: Logic to prioritize override points ---
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
                        // --- END MODIFIED ---
                    }

                });

                if (validationErrors.length > 0) {
                    throw new Error(validationErrors.join('\n'));
                }

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
    // --- End Bulk Upload Functions ---

    // --- NEW EXPORT LOGIC: Functions for Export Modal ---
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
            // Define a local type for the expanded record
            type ExpandedCouponRecord = PocketBaseCoupon & {
                expand?: {
                    company?: CompanyData;
                    redeemed_by?: {
                        id: string;
                        name: string;
                        email: string;
                        phone: string;
                    }
                }
            }

            // Show a message while fetching
            setExportError(null); // Clear previous errors

            const records = await pb.collection('coupons').getFullList<ExpandedCouponRecord>({
                batch: batchNum,
                sort: '-created',
                expand: 'company,redeemed_by',
                requestKey: null // request auto cancellation disabled
            });

            if (records.length === 0) {
                setExportError("No coupons found to export.");
                setIsExporting(false);
                return;
            }

            // Map data to a user-friendly format for Excel
            const dataToExport = records.map(coupon => ({
                'code': coupon.code,
                'company': coupon.expand?.company?.name || coupon.company, // Use company name
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

            // Create worksheet and workbook
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Coupons');

            // Generate filename with date and trigger download
            const dateStr = new Date().toLocaleString().replaceAll(" ", "_").replaceAll(",", "_").toUpperCase();
            XLSX.writeFile(wb, `coupons_export_${dateStr}_bs_${batchNum}.xlsx`);

            setIsExporting(false);
            handleCloseExportModal(); // Close modal on success

        } catch (err: any) {
            setExportError(err.message || 'An unknown error occurred during export.');
            setIsExporting(false);
        }
    };
    // --- END NEW EXPORT LOGIC ---


    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h1 className="text-3xl font-bold hidden lg:block">Coupon Management 🎫</h1>
                <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-neutral gap-2" onClick={handleOpenBulkModal}>
                        <Upload size={18} /> Bulk Upload
                    </button>
                    {/* --- MODIFIED: Corrected onClick handler --- */}
                    <button className="btn btn-success gap-2" onClick={handleOpenExportModal}>
                        <Download size={18} /> Export Excel
                    </button>
                    {/* --- END MODIFIED --- */}
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
                                {/* Table Head: Added padding, alignment, and whitespace control */}
                                <thead>
                                    <tr className="border-b border-base-content/10">
                                        <th className="py-3 px-4 text-left whitespace-nowrap">Code</th>
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

                                            {/* Code */}
                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                <CouponCodeDisplay code={coupon.code} />
                                            </td>

                                            {/* Company */}
                                            <td className="py-3 px-4 align-middle">
                                                {coupon.companyName || 'N/A'}
                                            </td>

                                            {/* MRP */}
                                            <td className="py-3 px-4 font-mono text-right align-middle whitespace-nowrap">
                                                {coupon.mrp?.toLocaleString() || 'N/A'}
                                            </td>

                                            {/* Points Value */}
                                            <td className="py-3 px-4 font-mono text-right align-middle whitespace-nowrap">
                                                {coupon.points.toLocaleString()}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                {getUsesBadge(coupon.redeemed)}
                                            </td>

                                            {/* --- MODIFIED: "Redeemed By" cell redesigned for readability --- */}
                                            <td className="py-3 px-4 align-middle">
                                                {coupon.redeemed_by ? (
                                                    <div className="flex items-center gap-3">
                                                        {/* Avatar */}
                                                        <UserAvatar user={coupon.redeemed_by} size={36} />
                                                        {/* Stacked Name/Email */}
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
                                            {/* --- END MODIFIED --- */}

                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                {coupon.timestamp ? formatDate(coupon.timestamp) : "N/A"}
                                            </td>
                                            {/* Created */}
                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                {coupon.created && formatDate(coupon.created)}
                                            </td>

                                            {/* Updated */}
                                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                                                {coupon.updated && formatDate(coupon.updated)}
                                            </td>

                                            {/* Actions */}
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

            {/* --- MODIFIED: Coupon Edit/Create Modal --- */}
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
                    {/* Form is always rendered to attach to state, but inputs are based on selectedCoupon */}
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

                        {/* --- NEW: Company Dropdown --- */}
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

                        {/* --- NEW: MRP Input --- */}
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
                        {/* --- END NEW --- */}

                        <div className="form-control">
                            <label className="label"><span className="label-text">Points Value</span></label>
                            <input
                                type="number"
                                name="points"
                                value={pointsInput}
                                className="input input-bordered w-full"
                                required
                                min="1"
                                onChange={(e) => setPointsInput(e.target.value)} // Allows manual override
                            />
                        </div>

                        <div className="alert alert-info shadow-lg text-sm">
                            Points are calculated automatically from MRP and Company. You can still set the points value manually.
                        </div>

                        <div className="modal-action">
                            <button type="button" className="btn btn-ghost" onClick={() => {
                                closeModal('coupon_edit_modal');
                                resetModalState(); // --- MODIFIED ---
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
                    <button onClick={resetModalState}>close</button> {/* --- MODIFIED --- */}
                </form>
            </dialog>
            {/* --- END MODIFIED --- */}


            {/* --- Bulk Upload Modal (Unchanged) --- */}
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
            {/* --- End Bulk Upload Modal --- */}

            {/* --- NEW: Export Excel Modal --- */}
            <dialog id="export_excel_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Export Coupons to Excel</h3>

                    <div className="py-4 space-y-4">
                        <p className="text-sm">
                            This will retrieve the most recent coupon records, with the number of records determined by the batch size (default is 500). For example, setting the batch size to 999 will fetch the last 999 records.
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
                                max="5000" // Set a reasonable max
                                step="100"
                                disabled={isExporting}
                            />
                        </div>

                        {/* --- Feedback Area --- */}
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
            {/* --- END NEW: Export Excel Modal --- */}


            {/* Render the QR Scanner Modal conditionally */}
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