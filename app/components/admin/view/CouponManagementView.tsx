"use client";

import { createOrUpdateCoupon, deleteCoupon, fetchCoupons } from "@/apis/api";
import { Coupon, PocketBaseCoupon } from "@/app/types";
import pb from "@/lib/pocketbase";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Pagination from "../../Pagination";



export default function CouponManagementView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

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
            (document.getElementById('coupon_edit_modal') as HTMLDialogElement)?.close();
            setSelectedCoupon(null);
        },
    });

    // Mutation for deleting coupon
    const couponDeleteMutation = useMutation({
        mutationFn: deleteCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
        },
    });

    const handleEditClick = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        (document.getElementById('coupon_edit_modal') as HTMLDialogElement)?.showModal();
    };

    const handleDeleteClick = (coupon: Coupon) => {
        if (window.confirm(`Are you sure you want to delete coupon ${coupon.code}?`)) {
            couponDeleteMutation.mutate(coupon.id);
        }
    };

    const handleCreateNew = () => {
        // Only including fields we know exist in the PocketBase collection from your API response sample
        setSelectedCoupon({ id: 'new', code: '', points: 0, usesStatus: 'available' });
        (document.getElementById('coupon_edit_modal') as HTMLDialogElement)?.showModal();
    }

    const handleModalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCoupon) return;
        const formData = new FormData(e.currentTarget);

        // We only send back code and points, as 'redeemed' is set by the system on use.
        const data: Partial<PocketBaseCoupon> = {
            code: formData.get('code') as string,
            points: parseInt(formData.get('points') as string, 10),
        };

        couponMutate.mutate({ id: selectedCoupon.id, data });
    };

    const getUsesBadge = (status: Coupon['usesStatus']) => {
        switch (status) {
            case 'redeemed': return <span className="badge badge-error">Redeemed (Single Use)</span>;
            case 'available':
            default: return <span className="badge badge-success">Available (Single Use)</span>;
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h1 className="text-3xl font-bold hidden lg:block">Coupon Management 🎫</h1>
                <button className="btn btn-primary gap-2" onClick={handleCreateNew}>
                    <Plus size={18} /> Create New Coupon
                </button>
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
                            {couponMutate.isSuccess ? 'Coupon saved successfully!' : couponMutate.isError ? `Error: ${couponMutate.error.message}` : 'Saving changes...'}
                        </div>
                    )}
                    {selectedCoupon && (
                        <form onSubmit={handleModalSubmit} className="space-y-4 pt-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text">Coupon Code</span></label>
                                <input type="text" name="code" defaultValue={selectedCoupon.code} className="input input-bordered font-mono w-full" required />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Points Value</span></label>
                                <input type="number" name="points" defaultValue={selectedCoupon.points} className="input input-bordered w-full" required min="1" />
                            </div>
                            {/* Removed fields for usesLeft/expiryDate to match provided API response structure */}
                            <div className="alert alert-info shadow-lg text-sm">
                                This coupon will be marked as **single-use** (redeemed: true) after the first successful redemption via the API.
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={() => (document.getElementById('coupon_edit_modal') as HTMLDialogElement)?.close()}>
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
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}