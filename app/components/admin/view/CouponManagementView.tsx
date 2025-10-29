"use client";

import { createOrUpdateCoupon, deleteCoupon, fetchCoupons } from "@/apis/api";
import { Coupon, PocketBaseCoupon } from "@/app/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2, QrCode, Upload } from "lucide-react"; // --- NEW ---
import { useState, useRef } from "react";
import Pagination from "../../Pagination";
import QRScannerModal from "../../QRScannerModal";
import pb from "@/lib/pocketbase";
import * as XLSX from 'xlsx';


// Helper function to show the modal by its ID
const showModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.showModal();
const closeModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.close();

// Helper type for parsed Excel row
type ParsedCouponRow = {
    code?: string;
    mrp?: number;
    company?: string;
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
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const [couponCodeInput, setCouponCodeInput] = useState<string>('');
    const [pointsInput, setPointsInput] = useState<number | string>('');
    const [mrpInput, setMrpInput] = useState<number | string>('');
    const [companyInput, setCompanyInput] = useState<string>(''); // Stores company ID
    const [companyName, setCompanyName] = useState<string>('')
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch coupons data
    const { data, isLoading, isError } = useQuery({
        queryKey: ['coupons', currentPage],
        queryFn: () => fetchCoupons(currentPage),
        refetchInterval: 60000, // Refetch every 60 seconds
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
                sort: 'name'
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
        setCompanyName('');
        couponMutate.reset();
    };
    // --- END NEW ---

    // Mutation for creating/updating coupon
    const couponMutate = useMutation({
        mutationFn: createOrUpdateCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            closeModal('coupon_edit_modal');
            resetModalState(); // --- MODIFIED ---
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
        // --- MODIFIED: Set all modal states ---
        setCouponCodeInput(initialCode || coupon.code);
        setPointsInput(coupon.points);
        // Assume 'coupon' type now includes 'mrp' and 'company_id' from your fetch
        setMrpInput(coupon.mrp || '');
        setCompanyInput(coupon.company_id || '');
        setCompanyName(coupon.company || '');
        // --- END MODIFIED ---
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
        // --- MODIFIED ---
        // Ensure new coupon has all properties, even if default
        const newCoupon: Coupon = {
            id: 'new',
            code: initialCode,
            points: 0,
            usesStatus: 'available',
            mrp: 0,
            company_id: '',
        };
        handleOpenModal(newCoupon, initialCode);
        // Set defaults for a new coupon
        setPointsInput('');
        setMrpInput('');
        setCompanyInput('');
        // --- END MODIFIED ---
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
            // You can show an error here if desired
            // For now, we rely on the input's `min="1"`
            return;
        }

        const data: Partial<PocketBaseCoupon> = {
            code: couponCodeInput,
            points: pointsNum,
            mrp: mrpNum,
            company_id: companyInput || "", // Send null if no company is selected
        };
        // --- END MODIFIED ---

        couponMutate.mutate({ id: selectedCoupon.id, data });
    };

    const getUsesBadge = (status: Coupon['usesStatus']) => {
        switch (status) {
            case 'redeemed': return <span className="badge badge-error">Redeemed</span>;
            case 'available':
            default: return <span className="badge badge-success">Available</span>;
        }
    }

    // --- Bulk Upload Functions (Unchanged) ---
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

                // --- MODIFIED: Use the 'companies' data from useQuery if available ---
                const companyList = companies || await pb.collection('companies').getFullList<CompanyData>({
                    page: 1,
                    perPage: 500,
                    fields: 'id, name, conversion_factor',
                    skipTotal: true,
                });
                // --- END MODIFIED ---

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

                        const companyData = companyList.find(c => c.name.toLowerCase() === company)

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
    // --- End Bulk Upload Functions ---


    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h1 className="text-3xl font-bold hidden lg:block">Coupon Management 🎫</h1>
                <div className="flex gap-2 flex-wrap">
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
                                        {/* --- MODIFIED: Added MRP and Company columns --- */}
                                        <th>Company</th>
                                        <th className="text-right">MRP</th>
                                        {/* --- END MODIFIED --- */}
                                        <th className="text-right">Points Value</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map(coupon => (
                                        <tr key={coupon.id} className="hover">
                                            <td><span className="font-mono badge badge-neutral p-3 font-semibold">{coupon.code}</span></td>
                                            {/* --- MODIFIED: Show company name and MRP --- */}
                                            {/* This assumes your 'fetchCoupons' expands the company_id */}
                                            <td>{coupon.company || 'N/A'}</td>
                                            <td className="font-mono text-right">{coupon.mrp?.toLocaleString() || 'N/A'}</td>
                                            {/* --- END MODIFIED --- */}
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