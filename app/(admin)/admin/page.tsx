"use client";

import { useState, useMemo } from 'react';
import {
    LayoutDashboard,
    Users,
    Gift,
    Ticket,
    QrCode,
    Menu, UserCircle,
    LogOut, Building2,
    Home
} from 'lucide-react';
import {
    useQuery
} from '@tanstack/react-query';

// NOTE: Replace this with your actual PocketBase client import
import pb from '@/lib/pocketbase';
import useProfileStore from '@/stores/profile.store';
import { AdminView } from '@/app/types';
import DashboardView from '@/app/components/admin/view/DashboardView';
import UserManagementView from '@/app/components/admin/view/UserManagementView';
import ScanCouponView from '@/app/components/admin/view/ScanCouponView';
import CouponManagementView from '@/app/components/admin/view/CouponManagementView';
import RedeemRequestView from '@/app/components/admin/view/RedeemRequestView';
import { deleteCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import CompanyManagementView from '@/app/components/admin/view/CompanyManagementView';


// --- APP BAR COMPONENT (To include profile image) ---
function AdminHeader({ activeView, viewTitles, toggleDrawer }: { activeView: AdminView, viewTitles: Record<AdminView, string>, toggleDrawer: () => void }) {
    const { profile, removeProfile } = useProfileStore(); // Use the mock/actual store
    const router = useRouter();

    // Construct the actual avatar URL for the current admin user
    const avatarUrl = useMemo(() => {
        if (profile?.avatar && profile.id && profile.collectionId) {
            // Replace DUMMY_BASE_URL with pb.baseURL if your PocketBase client is correctly configured
            return `${pb.baseURL}/api/files/${profile.collectionId}/${profile.id}/${profile.avatar}`;
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
                        {/* <li><a>Profile (Not implemented)</a></li>
                        <li><a>Settings (Not implemented)</a></li> */}
                        <li className='mb-2'>
                            <button
                                className="btn btn-outline btn-info"
                                onClick={() => {
                                    router.replace("/");
                                }}
                            >
                                <Home size={18} className="mr-2" />
                                Home
                            </button>
                        </li>
                        <li>
                            <button
                                className="btn btn-outline btn-error"
                                onClick={() => {
                                    pb.authStore.clear();
                                    deleteCookie('pb_auth');
                                    deleteCookie('role');
                                    removeProfile();
                                    router.replace("/signin");
                                }}
                            >
                                <LogOut size={18} className="mr-2" />
                                Logout
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}


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
        scan: 'Assign Coupons',
        companies: 'Company Management',
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
            case 'companies':
                return <CompanyManagementView />
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
                            <a onClick={() => handleSetView('companies')} className={activeView === 'companies' ? 'active font-semibold' : ''}>
                                <Building2 size={18} />
                                Companies
                            </a>
                        </li>
                        <li>
                            <a onClick={() => handleSetView('scan')} className={activeView === 'scan' ? 'active font-semibold' : ''}>
                                <QrCode size={18} />
                                Assign Coupons
                            </a>
                        </li>
                    </ul>
                    {/* Footer for desktop sidebar */}
                    <footer className="p-4 border-t border-base-content/10 text-xs text-center text-base-content/80">
                        <div>
                            JM Reward App © {new Date().getFullYear()}
                        </div>

                        <div className="mt-1 text-[10px] text-base-content/50">
                            Made with ❤️ by <a
                                href="https://wa.me/918249587552"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline hover:text-base-content/80"
                            >
                                SSC
                            </a>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}

// Component for the Redeem Requests menu item to show the pending count
function RedeemRequestsMenuItem({ handleSetView, activeView }: { handleSetView: (view: AdminView) => void, activeView: AdminView }) {

    const { data: allRequests = [], isLoading } = useQuery({
        queryKey: ['allRedeemRequestsForCount'],
        queryFn: () => pb.collection('redeem_requests').getFullList({ filter: 'status = "pending"' }),
        refetchInterval: 10000,
    });

    const pendingCount = allRequests.length;

    return (
        <a onClick={() => handleSetView('redeem')} className={activeView === 'redeem' ? 'active font-semibold' : ''}>
            <Gift size={18} />
            Redeem Requests
            {isLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
            ) : (
                pendingCount > 0 && <span className="badge badge-warning">{pendingCount}</span>
            )}
        </a>
    );
}






export default Admin;