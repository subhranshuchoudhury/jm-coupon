"use client";
import { fetchCoupons, fetchUsers } from "@/apis/api";
import pb from "@/lib/pocketbase";
import { useQuery } from "@tanstack/react-query";
import { Gift, Ticket, Users } from "lucide-react";

export default function DashboardView() {
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
            {/* <div className="card bg-base-100 shadow-xl border border-base-content/10">
                <div className="card-body">
                    <h2 className="card-title text-2xl">Recent Activity (Placeholder)</h2>
                    <p className="text-sm text-base-content/70">A chart or list of the latest user sign-ups or redemptions would go here.</p>
                    <div className="h-48 bg-base-200 rounded-lg flex items-center justify-center text-base-content/50">
                        Area for Graph/Chart
                    </div>
                </div>
            </div> */}
        </div>
    );
}