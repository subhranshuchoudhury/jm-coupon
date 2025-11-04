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
type SearchField = 'name' | 'id' | 'email' | 'phone';

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
        refetchInterval: 10000,
        refetchOnMount: true,
        refetchOnWindowFocus: true
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
            setSelectedUser(null); // Clear selected user after successful update
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

    // Function to reset the modal state and the mutation status
    const resetModalState = () => {
        // Clear the form data and selected user
        setSelectedUser(null);
        // Reset the mutation state to clear any lingering success/error messages
        userUpdateMutation.reset();
    }

    const handleEditClick = (user: User) => {
        // 1. Reset state to ensure fresh data in the modal
        resetModalState();
        // 2. Set the new user
        setSelectedUser(user);
        // 3. Open the modal
        // Note: Using a timeout to ensure the state updates (setting selectedUser) are processed
        // before the modal reads the state for its content, preventing the old data flash.
        setTimeout(() => {
            (document.getElementById('user_edit_modal') as HTMLDialogElement)?.showModal();
        }, 10);
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
            phone: formData.get('phone') as string,
            total_points: parseInt(formData.get('total_points') as string, 10),
            role: formData.get('role') as 'user' | 'admin',
        };

        userUpdateMutation.mutate({ id: selectedUser.id, data });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6 hidden lg:block">User Management 👥</h1>
            {/*  */}

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
                    <option value="phone">Search Phone</option>
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
                            <table className="table w-full min-w-[900px] lg:min-w-full">
                                <thead>
                                    <tr className="border-b border-base-content/10">
                                        <th className="min-w-64">Name / ID</th>
                                        <th className="min-w-52">Email</th>
                                        <th className="min-w-32 whitespace-nowrap">Phone</th>
                                        <th className="text-right min-w-36 whitespace-nowrap">Total Points</th>
                                        <th className="min-w-24 whitespace-nowrap">Role</th>
                                        <th className="text-center min-w-32">Actions</th>
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
                                            <td>
                                                {user.email}
                                                <button
                                                    className="btn btn-xs btn-ghost btn-circle"
                                                    title="Copy Email"
                                                    onClick={() => handleCopy(user.email, 'Email')}
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </td>
                                            {/* MODIFIED: Added whitespace-nowrap to the cell */}
                                            <td className="whitespace-nowrap">
                                                {(user as any).phone || 'N/A'}
                                                {(user as any).phone ? (
                                                    <button
                                                        className="btn btn-xs btn-ghost btn-circle"
                                                        title="Copy Phone"
                                                        onClick={() => handleCopy((user as any).phone, 'Phone')}
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                ) : null}
                                            </td>
                                            {/* MODIFIED: Added whitespace-nowrap to the cell */}
                                            <td className="font-mono text-right font-semibold whitespace-nowrap">
                                                {user.total_points.toLocaleString()}
                                            </td>
                                            {/* MODIFIED: Added whitespace-nowrap to the cell */}
                                            <td className="whitespace-nowrap">
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
            {/* The selectedUser check is moved inside to ensure the modal content is only rendered when a user is selected */}
            <dialog id="user_edit_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Edit User: {selectedUser?.name}</h3>
                    {/* The in-modal alert/toast display is removed as the component-level toast handles success/error */}
                    {selectedUser ? (
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

                            {/* New Phone Field */}
                            <div className="form-control">
                                <label className="label"><span className="label-text">Phone</span></label>
                                <div className="flex items-center gap-2">
                                    {/* Cast to any to handle the new field that might not be in the current User type without modifying your type file */}
                                    <input type="text" name="phone" defaultValue={(selectedUser as any).phone || ''} className="input input-bordered w-full" />
                                    <button
                                        type="button"
                                        className="btn btn-square btn-ghost"
                                        title="Copy Phone"
                                        onClick={() => handleCopy((selectedUser as any).phone, 'Phone')}
                                        disabled={!(selectedUser as any).phone}
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
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        (document.getElementById('user_edit_modal') as HTMLDialogElement)?.close();
                                        // Reset state when closing via cancel button as well
                                        resetModalState();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button className="btn btn-primary" type="submit" disabled={userUpdateMutation.isPending}>
                                    {userUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Fallback for when selectedUser is null/being reset
                        <div className="text-center p-4">Loading user details...</div>
                    )}
                </div>
                {/* The modal-backdrop form is crucial for closing on outside click, but we must also reset state */}
                <form method="dialog" className="modal-backdrop" onSubmit={resetModalState}>
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