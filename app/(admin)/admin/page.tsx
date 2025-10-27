"use client";

import React, { useState, useMemo } from 'react';
import {
    LayoutDashboard,
    Users,
    Gift,
    Ticket,
    QrCode,
    Menu,
    ChevronLeft,
    ChevronRight,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Plus,
    UserCircle,
} from 'lucide-react';
import {
    useQuery,
    useMutation,
    useQueryClient,
    // Add Placeholder Data for a better UX on initial load/pagination
    keepPreviousData
} from '@tanstack/react-query';
import { ListResult } from 'pocketbase'; // Import Record type

// NOTE: Replace this with your actual PocketBase client import
import pb from '@/lib/pocketbase';
import useProfileStore from '@/stores/profile.store';
import { AdminView, Coupon, PaginatedResult, PocketBaseCoupon, PocketBaseRedeemRequest, PocketBaseUser, RedeemRequestAdmin, RedeemStatus, User } from '@/app/types';

// --- CONFIGURATION ---
const PER_PAGE = 10;

// Utility function to format dates
const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Use 'T' split if the date string includes time and you only want the date part
    const datePart = dateString.split('T')[0].split(' ')[0];
    try {
        return new Date(datePart).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch (e) {
        return datePart; // Fallback to raw string if date parsing fails
    }
};


// --- POCKETBASE API LAYER (CUSTOM HOOKS AND FUNCTIONS) ---

// 1. USER API
const fetchUsers = async (page: number): Promise<PaginatedResult<User>> => {
    const resultList: ListResult<PocketBaseUser> = await pb.collection('users').getList(page, PER_PAGE, {
        sort: '-total_points',
    });

    const users: User[] = resultList.items.map(item => ({
        id: item.id,
        name: item.name || 'N/A',
        email: item.email,
        total_points: item.total_points || 0,
        role: item.role || 'user',
        avatar: item.avatar,
        avatarCollectionId: item.collectionId, // Include collection ID
    }));

    return {
        page: resultList.page,
        perPage: resultList.perPage,
        totalPages: resultList.totalPages,
        totalItems: resultList.totalItems,
        items: users,
    };
};

const updateUser = async ({ id, data }: { id: string, data: Partial<PocketBaseUser> }) => {
    return await pb.collection('users').update(id, data);
};

const deleteUser = async (id: string) => {
    return await pb.collection('users').delete(id);
};

// 2. REDEEM REQUESTS API
const fetchRedeemRequests = async (page: number): Promise<PaginatedResult<RedeemRequestAdmin>> => {
    const resultList: ListResult<PocketBaseRedeemRequest> = await pb.collection('redeem_requests').getList(page, PER_PAGE, {
        expand: 'user', // Request to expand the user relation
        sort: '-created',
    });

    const requests: RedeemRequestAdmin[] = resultList.items.map(item => {
        // Fallback for user name: 1. Expanded user name 2. full_name field 3. 'Unknown User'
        const userName = item.expand?.user?.name || item.full_name || 'Unknown User';
        // Coerce points to a number
        const pointsValue = typeof item.points === 'string' ? parseInt(item.points, 10) || 0 : item.points;

        return {
            id: item.id,
            userId: item.user,
            userName: userName,
            rewardTitle: item.title,
            points: pointsValue,
            status: item.status as RedeemStatus,
            message: item.message,
            date: item.created,
        };
    });

    return {
        page: resultList.page,
        perPage: resultList.perPage,
        totalPages: resultList.totalPages,
        totalItems: resultList.totalItems,
        items: requests,
    };
};

const updateRedeemRequest = async ({ id, data }: { id: string, data: Partial<PocketBaseRedeemRequest> }) => {
    // Ensure status is normalized to lowercase for PocketBase enum matching
    const normalizedData = {
        ...data,
        status: data.status?.toLowerCase(),
    };
    return await pb.collection('redeem_requests').update(id, normalizedData);
};


// 3. COUPON API (Adjusted to match your provided response fields)
const fetchCoupons = async (page: number): Promise<PaginatedResult<Coupon>> => {
    // PocketBase response from getList of 'coupons' collection
    const resultList: ListResult<PocketBaseCoupon> = await pb.collection('coupons').getList(page, PER_PAGE, {
        sort: '-created',
    });

    const coupons: Coupon[] = resultList.items.map(item => {
        // Since your provided schema only has a boolean 'redeemed' field, 
        // we'll use a simplified status instead of a hypothetical 'usesLeft' field.
        const usesStatus = item.redeemed ? 'redeemed' : 'available';

        return {
            id: item.id,
            code: item.code,
            points: item.points, // Assuming points is a number or can be parsed
            usesStatus: usesStatus,
            // expiryDate: item.expiryDate?.split(' ')[0] || '', // Removed due to missing field
        };
    });

    return {
        page: resultList.page,
        perPage: resultList.perPage,
        totalPages: resultList.totalPages,
        totalItems: resultList.totalItems,
        items: coupons,
    };
};

// Payload simplified to only use existing fields in your example
const createOrUpdateCoupon = async ({ id, data }: { id: string | 'new', data: Partial<PocketBaseCoupon> }) => {
    const payload: Partial<PocketBaseCoupon> = {
        code: data.code,
        points: data.points,
    };

    if (id === 'new') {
        return await pb.collection('coupons').create(payload);
    } else {
        return await pb.collection('coupons').update(id, payload);
    }
};

const deleteCoupon = async (id: string) => {
    return await pb.collection('coupons').delete(id);
};

// 4. Manual Point Grant API
const manualPointGrant = async (data: { userId: string, points: number, code: string }) => {
    // This action typically involves two steps:
    // 1. Create a transaction record (in a 'coupons_transactions' or 'points_log' collection)
    // 2. Update the user's total_points (either manually or via a PocketBase hook on transaction create)

    // For a safe example, we'll create the log record first.
    const transactionRecord = await pb.collection('coupons_transactions').create({
        user: data.userId,
        points: data.points,
        message: `Admin Issued: ${data.code}`,
        type: 'admin_grant',
    });

    // You would then update the user's points here, or rely on a PocketBase server-side hook
    // await pb.collection('users').update(data.userId, {
    //     'total_points+': data.points // Example of incrementing a number field
    // });

    return transactionRecord;
};


// --- AVATAR COMPONENT ---

function UserAvatar({ user, size }: { user: User, size: number }) {
    if (user.avatar && user.avatarCollectionId) {
        // Construct the full avatar URL
        const avatarUrl = `${pb.baseURL}api/files/${user.avatarCollectionId}/${user.id}/${user.avatar}`;
        return (
            <div className="avatar">
                <div className="mask mask-squircle w-12 h-12">
                    <img src={avatarUrl} alt={`${user.name}'s avatar`} width={size} height={size} />
                </div>
            </div>
        );
    }
    // Fallback: simple text-based avatar
    const initial = user.name.substring(0, 2).toUpperCase();
    return (
        <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-12 h-12">
                <span>{initial}</span>
            </div>
        </div>
    );
}

// --- APP BAR COMPONENT (To include profile image) ---
function AdminHeader({ activeView, viewTitles, toggleDrawer }: { activeView: AdminView, viewTitles: Record<AdminView, string>, toggleDrawer: () => void }) {
    const { profile } = useProfileStore(); // Use the mock/actual store

    // Construct the actual avatar URL for the current admin user
    const avatarUrl = useMemo(() => {
        if (profile?.avatar && profile.uid && profile.avatarCollectionId) {
            // Replace DUMMY_BASE_URL with pb.baseURL if your PocketBase client is correctly configured
            return `${pb.baseURL}api/files/${profile.avatarCollectionId}/${profile.uid}/${profile.avatar}`;
        }
        return null;
    }, [profile]);

    return (
        <div className="navbar bg-base-100 sticky top-0 z-30 shadow-md">
            {/* Mobile Menu Button */}
            <div className="flex-none lg:hidden">
                <button
                    aria-label="open sidebar"
                    className="btn btn-square btn-ghost"
                    onClick={toggleDrawer}
                >
                    <Menu />
                </button>
            </div>
            {/* Title for Mobile/Breadcrumb for Desktop */}
            <div className="flex-1">
                <a className="btn btn-ghost text-xl normal-case">{viewTitles[activeView]}</a>
            </div>
            {/* Profile Menu */}
            <div className="flex-none">
                <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                        <div className="w-10 rounded-full">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Admin Avatar" width={40} height={40} />
                            ) : (
                                <UserCircle size={40} className="text-primary" />
                            )}
                        </div>
                    </label>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-1 p-2 shadow bg-base-200 rounded-box w-52">
                        <li><a>Profile (Not implemented)</a></li>
                        <li><a>Settings (Not implemented)</a></li>
                        <li><a>Logout (Not implemented)</a></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}


// --- MAIN APPLICATION STRUCTURE ---

/**
 * Main Admin Panel Component Wrapper
 */


/**
 * Main Admin Panel Component
 */
function Admin() {
    const [activeView, setActiveView] = useState<AdminView>('dashboard');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const handleSetView = (view: AdminView) => {
        setActiveView(view);
        setIsDrawerOpen(false); // Close drawer on mobile after selection
    };

    const toggleDrawer = () => setIsDrawerOpen(prev => !prev);

    const viewTitles: Record<AdminView, string> = {
        dashboard: 'Admin Dashboard',
        users: 'User Management',
        redeem: 'Redeem Requests',
        coupons: 'Coupon Management',
        scan: 'Scan / Enter Coupon',
    };

    // Main content renderer
    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <DashboardView />;
            case 'users':
                return <UserManagementView />;
            case 'redeem':
                return <RedeemRequestView />;
            case 'coupons':
                return <CouponManagementView />;
            case 'scan':
                return <ScanCouponView />;
            default:
                return <DashboardView />;
        }
    };

    return (
        <div className="drawer lg:drawer-open min-h-screen bg-base-200">
            {/* This checkbox manages the drawer state on mobile */}
            <input
                id="admin-drawer-toggle"
                type="checkbox"
                className="drawer-toggle"
                checked={isDrawerOpen}
                onChange={toggleDrawer}
            />

            {/* --- Page Content --- */}
            <div className="drawer-content flex flex-col">
                {/* Page Header (replaces the old mobile header) */}
                <AdminHeader activeView={activeView} viewTitles={viewTitles} toggleDrawer={toggleDrawer} />

                {/* Main Content Area */}
                <main className="flex-1 p-4 lg:p-8">
                    {renderView()}
                </main>
            </div>

            {/* --- Drawer Side --- */}
            <div className="drawer-side z-40">
                <label
                    htmlFor="admin-drawer-toggle"
                    aria-label="close sidebar"
                    className="drawer-overlay"
                ></label>
                <div className="p-4 w-80 min-h-full bg-base-100 text-base-content flex flex-col">
                    {/* Sidebar Header */}
                    <div className="text-2xl font-bold p-4 mb-4 border-b border-base-content/10">
                        Admin Panel ⚙️
                    </div>

                    {/* Navigation Menu */}
                    <ul className="menu text-base font-medium flex-1">
                        <li>
                            <a onClick={() => handleSetView('dashboard')} className={activeView === 'dashboard' ? 'active font-semibold' : ''}>
                                <LayoutDashboard size={18} />
                                Dashboard
                            </a>
                        </li>
                        <li>
                            <a onClick={() => handleSetView('users')} className={activeView === 'users' ? 'active font-semibold' : ''}>
                                <Users size={18} />
                                Users
                            </a>
                        </li>
                        <li>
                            <RedeemRequestsMenuItem handleSetView={handleSetView} activeView={activeView} />
                        </li>
                        <li>
                            <a onClick={() => handleSetView('coupons')} className={activeView === 'coupons' ? 'active font-semibold' : ''}>
                                <Ticket size={18} />
                                Coupons
                            </a>
                        </li>
                        <li>
                            <a onClick={() => handleSetView('scan')} className={activeView === 'scan' ? 'active font-semibold' : ''}>
                                <QrCode size={18} />
                                Scan Coupon
                            </a>
                        </li>
                    </ul>
                    {/* Footer for desktop sidebar */}
                    <footer className="p-4 border-t border-base-content/10 text-xs text-center text-base-content/50">
                        JM Rewards Admin Panel © {new Date().getFullYear()}
                    </footer>
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS FOR EACH VIEW ---

// Component for the Redeem Requests menu item to show the pending count
function RedeemRequestsMenuItem({ handleSetView, activeView }: { handleSetView: (view: AdminView) => void, activeView: AdminView }) {

    const { data: allRequests = [], isLoading } = useQuery({
        queryKey: ['allRedeemRequestsForCount'],
        queryFn: () => pb.collection('redeem_requests').getFullList({ filter: 'status = "pending"' }),
        refetchInterval: 10000,
    });

    const pendingCount = allRequests.length;

    return (
        <li>
            <a onClick={() => handleSetView('redeem')} className={activeView === 'redeem' ? 'active font-semibold' : ''}>
                <Gift size={18} />
                Redeem Requests
                {isLoading ? (
                    <span className="loading loading-spinner loading-xs"></span>
                ) : (
                    pendingCount > 0 && <span className="badge badge-warning">{pendingCount}</span>
                )}
            </a>
        </li>
    );
}


/**
 * Dashboard View
 */
function DashboardView() {
    // Fetch total users for the dashboard
    const { data: userData } = useQuery({
        queryKey: ['users', 1],
        queryFn: () => fetchUsers(1),
        staleTime: 60000,
    });

    // Fetch pending requests count for the dashboard
    const { data: pendingRequestsData, isLoading: isLoadingRequests } = useQuery({
        queryKey: ['allRedeemRequestsForCount'],
        queryFn: () => pb.collection('redeem_requests').getFullList({ filter: 'status = "pending"' }),
        staleTime: 5000,
    });

    // Fetch total coupons for the dashboard
    const { data: couponData } = useQuery({
        queryKey: ['coupons', 1],
        queryFn: () => fetchCoupons(1),
        staleTime: 60000,
    });

    const totalUsers = userData?.totalItems ?? '...';
    const pendingRequests = pendingRequestsData?.length ?? '...';
    const totalCoupons = couponData?.totalItems ?? '...';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6 hidden lg:block">Admin Dashboard 📊</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="stats shadow bg-base-100 border border-primary/20">
                    <div className="stat">
                        <div className="stat-figure text-primary">
                            <Users size={32} />
                        </div>
                        <div className="stat-title">Total Users</div>
                        <div className="stat-value">{totalUsers}</div>
                    </div>
                </div>

                <div className="stats shadow bg-base-100 border border-warning/20">
                    <div className="stat">
                        <div className="stat-figure text-warning">
                            <Gift size={32} />
                        </div>
                        <div className="stat-title">Pending Requests</div>
                        <div className="stat-value">
                            {isLoadingRequests ? <span className="loading loading-spinner loading-sm"></span> : pendingRequests}
                        </div>
                        <div className="stat-desc">Needs attention</div>
                    </div>
                </div>

                <div className="stats shadow bg-base-100 border border-secondary/20">
                    <div className="stat">
                        <div className="stat-figure text-secondary">
                            <Ticket size={32} />
                        </div>
                        <div className="stat-title">Total Coupons</div>
                        <div className="stat-value">{totalCoupons}</div>
                    </div>
                </div>
            </div>
            {/* Simple placeholder for recent activity/chart */}
            <div className="card bg-base-100 shadow-xl border border-base-content/10">
                <div className="card-body">
                    <h2 className="card-title text-2xl">Recent Activity (Placeholder)</h2>
                    <p className="text-sm text-base-content/70">A chart or list of the latest user sign-ups or redemptions would go here.</p>
                    <div className="h-48 bg-base-200 rounded-lg flex items-center justify-center text-base-content/50">
                        Area for Graph/Chart
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// User Management View
// ----------------------------------------------------------------------

function UserManagementView() {
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
                                                        <div className="text-sm opacity-50">{user.id.slice(0, 6)}...</div>
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

// ----------------------------------------------------------------------
// Redeem Request View
// ----------------------------------------------------------------------

function RedeemRequestView() {
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

// ----------------------------------------------------------------------
// Coupon Management View
// ----------------------------------------------------------------------

function CouponManagementView() {
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

// ----------------------------------------------------------------------
// Scan Coupon View
// ----------------------------------------------------------------------

function ScanCouponView() {
    const [couponCode, setCouponCode] = useState('');
    const [points, setPoints] = useState(0);
    const [userId, setUserId] = useState('');
    const [message, setMessage] = useState('');
    const queryClient = useQueryClient();

    // Mutation for manual point injection (using the new manualPointGrant function)
    const manualPointsMutation = useMutation({
        mutationFn: manualPointGrant,
        onSuccess: () => {
            setMessage('Points successfully granted! User data might take a moment to refresh.');
            setCouponCode('');
            setPoints(0);
            setUserId('');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setTimeout(() => setMessage(''), 5000);
        },
        onError: (error: Error) => {
            setMessage(`Error granting points: ${error.message}`);
            setTimeout(() => setMessage(''), 10000);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!couponCode || points <= 0 || !userId) {
            setMessage('Please enter a valid code, points value, and a Target User ID.');
            return;
        }

        manualPointsMutation.mutate({
            userId,
            points,
            code: couponCode,
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6 hidden lg:block">Scan or Enter Coupon 🔑</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Manual Entry */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title text-2xl">Manual Point / Coupon Assignment</h2>
                        <p className="text-sm text-base-content/70">Manually assign a point value and identifier to a specific user via their PocketBase ID.</p>

                        {message && (
                            <div className={`alert ${manualPointsMutation.isSuccess ? 'alert-success' : manualPointsMutation.isError ? 'alert-error' : 'alert-info'} mt-4`}>
                                {message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text font-semibold">Coupon Code/Identifier (For Log)</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g., ADMIN_GRANT_2025"
                                    className="input input-bordered w-full"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text font-semibold">Points Value</span></label>
                                <input
                                    type="number"
                                    placeholder="e.g., 100"
                                    className="input input-bordered w-full"
                                    value={points}
                                    onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
                                    required
                                    min="1"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text font-semibold">Target User ID (PocketBase ID)</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g., df2iub1g99ls990"
                                    className="input input-bordered w-full font-mono"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="card-actions justify-end">
                                <button className="btn btn-primary" type="submit" disabled={manualPointsMutation.isPending}>
                                    {manualPointsMutation.isPending ? 'Processing...' : 'Submit Code & Grant Points'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* QR Scanner Placeholder */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title text-2xl">QR Code Scanner (Mobile)</h2>
                        <p className="text-sm text-base-content/70">Use this on a mobile device to quickly scan and apply physical coupons or QR codes generated from the system.</p>
                        <div className="flex flex-col items-center justify-center min-h-64 rounded-lg bg-base-200 border border-dashed border-base-content/30 mt-4 p-4">
                            <QrCode size={64} className="text-base-content/30" />
                            <p className="text-base-content/60 mt-4 text-center">
                                Integration with a library like `react-qr-reader` is required here.
                            </p>
                            <button className="btn btn-accent mt-6" disabled>
                                Start Camera
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


/**
 * Reusable Pagination Component
 */
type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
};

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-center pt-2">
            <div className="join">
                <button
                    className="join-item btn btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    <ChevronLeft size={16} /> Prev
                </button>
                {/* Always show current page button */}
                <button className="join-item btn btn-sm btn-active pointer-events-none">
                    {currentPage} / {totalPages}
                </button>
                <button
                    className="join-item btn btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    Next <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

export default Admin;