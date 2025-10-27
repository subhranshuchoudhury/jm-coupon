"use client";
import { deleteUser, fetchUsers, updateUser } from "@/apis/api";
import { PocketBaseUser, User } from "@/app/types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Trash2, Search, Copy, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import Pagination from "../../Pagination";
import UserAvatar from "../UserAvatar";
import useDebounce from "@/hooks/useDebounce"; // Assuming this is correctly implemented

// Define Search Fields
type SearchField = 'name' | 'id' | 'email';

export default function UserManagementView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null); // State for delete modal
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null); // State for toast notification

    // --- Search State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState<SearchField>('name');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Fetch data using React Query
    const { data, isLoading, isError } = useQuery({
        queryKey: ['users', currentPage, debouncedSearchTerm, searchField],
        queryFn: () => fetchUsers(currentPage, debouncedSearchTerm, searchField),
        placeholderData: keepPreviousData,
    });

    // Reset page when debounced search term changes
    if (debouncedSearchTerm !== data?.searchTermUsed && currentPage !== 1) {
        setCurrentPage(1);
    }

    // Mutation for updating user
    const userUpdateMutation = useMutation({
        mutationFn: updateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['allRedeemRequestsForCount'] });
            (document.getElementById('user_edit_modal') as HTMLDialogElement)?.close();
            setToast({ message: 'User updated successfully!', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        },
        onError: (error: Error) => {
            setToast({ message: `Error updating user: ${error.message}`, type: 'error' });
            setTimeout(() => setToast(null), 5000);
        }
    });

    // Mutation for deleting user
    const userDeleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setToast({ message: 'User deleted successfully!', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        },
        onError: (error: Error) => {
            setToast({ message: `Error deleting user: ${error.message}`, type: 'error' });
            setTimeout(() => setToast(null), 5000);
        }
    });

    // --- Handlers ---
    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        (document.getElementById('user_edit_modal') as HTMLDialogElement)?.showModal();
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        (document.getElementById('delete_confirmation_modal') as HTMLDialogElement)?.showModal();
    };

    const confirmDelete = () => {
        if (userToDelete) {
            userDeleteMutation.mutate(userToDelete.id);
            setUserToDelete(null);
            (document.getElementById('delete_confirmation_modal') as HTMLDialogElement)?.close();
        }
    };

    const handleCopy = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setToast({ message: `${fieldName} copied to clipboard!`, type: 'success' });
        } catch (err) {
            console.error('Failed to copy: ', err);
            setToast({ message: `Failed to copy ${fieldName}.`, type: 'error' });
        }
        setTimeout(() => setToast(null), 3000);
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

            {/* Toast Notification */}
            {toast && (
                <div className={`toast toast-end z-50`}>
                    <div className={`alert ${toast.type === 'success' ? 'alert-success' : toast.type === 'error' ? 'alert-error' : 'alert-info'}`}>
                        {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            {/* Search Bar Implementation */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60 pointer-events-none" />
                    <input
                        type="text"
                        placeholder={`Search by ${searchField.toUpperCase()}...`}
                        className="input input-bordered w-full pl-10 pr-4"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Search Field Selector */}
                <select
                    className="select select-bordered w-full sm:w-48 shrink-0"
                    value={searchField}
                    onChange={(e) => {
                        setSearchField(e.target.value as SearchField);
                        setSearchTerm(''); // Clear term when changing field for clarity
                    }}
                >
                    <option value="name">Search Name</option>
                    <option value="email">Search Email</option>
                    <option value="id">Search User ID</option>
                </select>
            </div>
            {/* End Search Bar Implementation */}

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        {isLoading && !data ? (
                            <div className="flex justify-center items-center h-64">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : isError || !data ? (
                            <div className="text-error text-center p-8">Error loading users. Please check your PocketBase connection.</div>
                        ) : data.items.length === 0 ? (
                            <div className="text-info text-center p-8">No users found matching your search criteria.</div>
                        ) : (
                            <table className="table w-full">
                                <thead>
                                    <tr className="border-b border-base-content/10">
                                        <th>Name / ID</th>
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
                                                        <div className="text-sm opacity-50 flex items-center gap-1">
                                                            <span className="font-mono">{user.id}</span>
                                                            <button
                                                                className="btn btn-xs btn-ghost btn-circle"
                                                                title="Copy User ID"
                                                                onClick={() => handleCopy(user.id, 'User ID')}
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="flex items-center gap-1 pt-6">
                                                {user.email}
                                                <button
                                                    className="btn btn-xs btn-ghost btn-circle"
                                                    title="Copy Email"
                                                    onClick={() => handleCopy(user.email, 'Email')}
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </td>
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
                    {data && data.items.length > 0 && (
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
                            <p className="text-sm flex items-center gap-2">
                                <strong>User ID:</strong> <span className="font-mono">{selectedUser.id}</span>
                                <button
                                    type="button"
                                    className="btn btn-xs btn-ghost btn-circle"
                                    title="Copy User ID"
                                    onClick={() => handleCopy(selectedUser.id, 'User ID')}
                                >
                                    <Copy size={12} />
                                </button>
                            </p>

                            <div className="form-control">
                                <label className="label"><span className="label-text">Full Name</span></label>
                                <input type="text" name="name" defaultValue={selectedUser.name} className="input input-bordered w-full" required />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Email</span></label>
                                <div className="flex items-center gap-2">
                                    <input type="email" name="email" defaultValue={selectedUser.email} className="input input-bordered w-full" required />
                                    <button
                                        type="button"
                                        className="btn btn-square btn-ghost"
                                        title="Copy Email"
                                        onClick={() => handleCopy(selectedUser.email, 'Email')}
                                    >
                                        <Copy size={20} />
                                    </button>
                                </div>
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

            {/* Delete Confirmation Modal */}
            <dialog id="delete_confirmation_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg text-error">Confirm Deletion</h3>
                    <p className="py-4">
                        Are you absolutely sure you want to delete the user **{userToDelete?.name}**?
                        This action cannot be undone.
                    </p>
                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => (document.getElementById('delete_confirmation_modal') as HTMLDialogElement)?.close()}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-error"
                            onClick={confirmDelete}
                            disabled={userDeleteMutation.isPending}
                        >
                            {userDeleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
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
