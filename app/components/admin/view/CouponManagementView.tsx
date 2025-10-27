"use client";

import { createOrUpdateCoupon, deleteCoupon, fetchCoupons } from "@/apis/api";
import { Coupon, PocketBaseCoupon } from "@/app/types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2, QrCode } from "lucide-react";
import { useState } from "react";
import Pagination from "../../Pagination";
import QRScannerModal from "../../QRScannerModal";

// Helper function to show the modal by its ID
const showModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.showModal();
const closeModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.close();

export default function CouponManagementView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState<string>('');


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

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h1 className="text-3xl font-bold hidden lg:block">Coupon Management 🎫</h1>
                <div className="flex gap-2">
                    <button className="btn btn-secondary gap-2" onClick={() => setIsScannerOpen(true)}>
                        <QrCode size={18} /> Scan QR Code
                    </button>
                    <button className="btn btn-primary gap-2" onClick={() => handleCreateNew()}>
                        <Plus size={18} /> Create New Coupon
                    </button>
                </div>
            </div>

            {/* ... (rest of the table view remains the same) ... */}

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
                                        <th>Status (Simplified)</th>
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
                                    // FIX 2: Use 'value' to make this a controlled component
                                    value={couponCodeInput}
                                    className="input input-bordered font-mono w-full"
                                    required
                                    // Handle manual input change to keep local state updated
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
                                {/* FIX 1: Add state cleanup to the Cancel button */}
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
                {/* The backdrop button already has the necessary cleanup */}
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => {
                        setSelectedCoupon(null);
                        setCouponCodeInput('');
                    }}>close</button>
                </form>
            </dialog>

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