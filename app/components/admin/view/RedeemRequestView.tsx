"use client";

import { fetchRedeemRequests, updateRedeemRequest } from "@/apis/api";
import { PocketBaseRedeemRequest, RedeemRequestAdmin, RedeemStatus } from "@/app/types";
import { formatDate } from "@/utils";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Edit, XCircle } from "lucide-react";
import { useState } from "react";
import Pagination from "../../Pagination";

export default function RedeemRequestView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRequest, setSelectedRequest] = useState<RedeemRequestAdmin | null>(null);

    // Fetch data using React Query
    const { data, isLoading, isError } = useQuery({
        queryKey: ['redeem', currentPage],
        queryFn: () => fetchRedeemRequests(currentPage),
        placeholderData: keepPreviousData,
    });

    // Mutation for updating redeem request status/message
    const redeemUpdateMutation = useMutation({
        mutationFn: updateRedeemRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['redeem'] });
            queryClient.invalidateQueries({ queryKey: ['allRedeemRequestsForCount'] });
            (document.getElementById('redeem_modify_modal') as HTMLDialogElement)?.close();
        },
    });

    const handleModifyClick = (request: RedeemRequestAdmin) => {
        setSelectedRequest(request);
        (document.getElementById('redeem_modify_modal') as HTMLDialogElement)?.showModal();
    };

    const handleModalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedRequest) return;
        const formData = new FormData(e.currentTarget);

        const data: Partial<PocketBaseRedeemRequest> = {
            status: formData.get('status') as RedeemStatus,
            message: formData.get('message') as string,
            // NOTE: We don't modify points or user relation here.
        };

        redeemUpdateMutation.mutate({ id: selectedRequest.id, data });
    };


    const getStatusBadge = (status: RedeemStatus) => {
        switch (status.toLowerCase()) {
            case 'approved': return <span className="badge badge-success gap-2"><CheckCircle size={14} /> Approved</span>;
            case 'rejected': return <span className="badge badge-error gap-2"><XCircle size={14} /> Rejected</span>;
            case 'pending':
            default:
                return <span className="badge badge-warning gap-2"><AlertCircle size={14} /> Pending</span>;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6 hidden lg:block">Redeem Requests 🎁</h1>
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        {isLoading && !data ? (
                            <div className="flex justify-center items-center h-64">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : isError || !data ? (
                            <div className="text-error text-center p-8">Error loading requests. Please check your PocketBase connection.</div>
                        ) : (
                            <table className="table w-full">
                                <thead>
                                    <tr className="border-b border-base-content/10">
                                        <th>User</th>
                                        <th>Reward Title</th>
                                        <th className="text-right">Points</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th className="w-1/6 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map(req => (
                                        <tr key={req.id} className="hover">
                                            <td className="font-semibold">{req.userName}</td>
                                            <td>{req.rewardTitle}</td>
                                            <td className="font-mono text-right">{req.points.toLocaleString()}</td>
                                            <td>{getStatusBadge(req.status)}</td>
                                            <td>{formatDate(req.date)}</td>
                                            <td className="text-center">
                                                <button
                                                    className="btn btn-sm btn-primary tooltip tooltip-top"
                                                    data-tip="Modify Status"
                                                    onClick={() => handleModifyClick(req)}
                                                >
                                                    <Edit size={16} /> Modify
                                                </button>
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

            {/* Redeem Modify Modal */}
            <dialog id="redeem_modify_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Modify Request: {selectedRequest?.rewardTitle}</h3>
                    {(redeemUpdateMutation.isPending || redeemUpdateMutation.isSuccess || redeemUpdateMutation.isError) && (
                        <div className={`alert ${redeemUpdateMutation.isSuccess ? 'alert-success' : redeemUpdateMutation.isError ? 'alert-error' : 'alert-info'} my-2`}>
                            {redeemUpdateMutation.isSuccess ? 'Request updated successfully!' : redeemUpdateMutation.isError ? `Error: ${redeemUpdateMutation.error.message}` : 'Saving changes...'}
                        </div>
                    )}
                    {selectedRequest && (
                        <form onSubmit={handleModalSubmit} className="space-y-4 pt-4">
                            <p className="text-sm"><strong>User:</strong> {selectedRequest.userName}</p>
                            <p className="text-sm"><strong>Points:</strong> <span className="font-mono">{selectedRequest.points} pts</span></p>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Status</span></label>
                                <select className="select select-bordered w-full" name="status" defaultValue={selectedRequest.status.toLowerCase()}>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Admin Message / Response</span></label>
                                <textarea
                                    className="textarea textarea-bordered h-24 w-full"
                                    placeholder="Add a voucher code, UPI transaction details, or rejection reason..."
                                    name="message"
                                    defaultValue={selectedRequest.message}
                                ></textarea>
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={() => (document.getElementById('redeem_modify_modal') as HTMLDialogElement)?.close()}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" type="submit" disabled={redeemUpdateMutation.isPending}>
                                    Save Changes
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