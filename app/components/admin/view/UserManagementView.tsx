"use client";
import { deleteUser, fetchUsers, updateUser } from "@/apis/api";
import { PocketBaseUser, User } from "@/app/types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import Pagination from "../../Pagination";
import UserAvatar from "../UserAvatar";

export default function UserManagementView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Fetch data using React Query
    const { data, isLoading, isError } = useQuery({
        queryKey: ['users', currentPage],
        queryFn: () => fetchUsers(currentPage),
        placeholderData: keepPreviousData,
    });

    // Mutation for updating user
    const userUpdateMutation = useMutation({
        mutationFn: updateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['allRedeemRequestsForCount'] });
            (document.getElementById('user_edit_modal') as HTMLDialogElement)?.close();
        },
    });

    // Mutation for deleting user
    const userDeleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        (document.getElementById('user_edit_modal') as HTMLDialogElement)?.showModal();
    };

    const handleDeleteClick = (user: User) => {
        if (window.confirm(`Are you sure you want to delete user ${user.name}? This action cannot be undone.`)) {
            userDeleteMutation.mutate(user.id);
        }
    };

    const handleModalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedUser) return;
        const formData = new FormData(e.currentTarget);

        const data: Partial<PocketBaseUser> = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            total_points: parseInt(formData.get('total_points') as string, 10),
            role: formData.get('role') as 'user' | 'admin',
        };

        userUpdateMutation.mutate({ id: selectedUser.id, data });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6 hidden lg:block">User Management 👥</h1>
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        {isLoading && !data ? (
                            <div className="flex justify-center items-center h-64">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : isError || !data ? (
                            <div className="text-error text-center p-8">Error loading users. Please check your PocketBase connection.</div>
                        ) : (
                            <table className="table w-full">
                                {/* head */}
                                <thead>
                                    <tr className="border-b border-base-content/10">
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th className="text-right">Total Points</th>
                                        <th>Role</th>
                                        <th className="w-1/6 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map(user => (
                                        <tr key={user.id} className="hover">
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={user} size={48} />
                                                    <div>
                                                        <div className="font-bold">{user.name}</div>
                                                        <div className="text-sm opacity-50">{user.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{user.email}</td>
                                            <td className="font-mono text-right font-semibold">{user.total_points.toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-ghost'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <div className="join">
                                                    <button
                                                        className="btn btn-sm btn-ghost join-item tooltip tooltip-top"
                                                        data-tip="Edit User"
                                                        onClick={() => handleEditClick(user)}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-ghost text-error join-item tooltip tooltip-top"
                                                        data-tip="Delete User"
                                                        onClick={() => handleDeleteClick(user)}
                                                        disabled={userDeleteMutation.isPending}
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

            {/* User Edit Modal */}
            <dialog id="user_edit_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Edit User: {selectedUser?.name}</h3>
                    {(userUpdateMutation.isPending || userUpdateMutation.isSuccess || userUpdateMutation.isError) && (
                        <div className={`alert ${userUpdateMutation.isSuccess ? 'alert-success' : userUpdateMutation.isError ? 'alert-error' : 'alert-info'} my-2`}>
                            {userUpdateMutation.isSuccess ? 'User updated successfully!' : userUpdateMutation.isError ? `Error: ${userUpdateMutation.error.message}` : 'Saving changes...'}
                        </div>
                    )}
                    {selectedUser && (
                        <form onSubmit={handleModalSubmit} className="space-y-4 pt-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text">Full Name</span></label>
                                <input type="text" name="name" defaultValue={selectedUser.name} className="input input-bordered w-full" required />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Email</span></label>
                                <input type="email" name="email" defaultValue={selectedUser.email} className="input input-bordered w-full" required />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Total Points</span></label>
                                <input type="number" name="total_points" defaultValue={selectedUser.total_points} className="input input-bordered w-full" required min="0" />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Role</span></label>
                                <select className="select select-bordered w-full" name="role" defaultValue={selectedUser.role}>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={() => (document.getElementById('user_edit_modal') as HTMLDialogElement)?.close()}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" type="submit" disabled={userUpdateMutation.isPending}>
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

