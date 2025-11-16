"use client";
import { fetchCompanies, fetchCoupons, fetchUsers } from "@/apis/api";
import pb from "@/lib/pocketbase";
import { useQuery } from "@tanstack/react-query";
import { Building2, Gift, Ticket, Users } from "lucide-react";
// Import the new chart component and its type
import type { RecordModel } from "pocketbase";
import CompanyStatsChart, { StatItem } from "../../charts/CompanyStatsChart";
import CompanySellStatsBarChart, { SellStatItem } from "../../charts/LifeTimeCompanyStatsChart";
import DateWiseStatsLineChart, { DateStatItem } from "../../charts/DateWiseStatsLineChart";

// A generic type for PocketBase list results (simplified)
interface PbListResult<T> {
    page: number;
    perPage: number;
    totalPages: number;
    totalItems: number;
    items: T[];
}

// A simple type for the redeem request
interface RedeemRequest extends RecordModel {
    status: "pending" | "approved" | "rejected";
    // ... add other fields if you need them
}

export default function DashboardView() {
    // Fetch total users for the dashboard
    const { data: userData } = useQuery<PbListResult<any>>({
        queryKey: ['users', 1],
        queryFn: () => fetchUsers(1),
        refetchInterval: 10000,
        refetchOnMount: true
    });

    // Fetch pending requests count for the dashboard
    const { data: pendingRequestsData, isLoading: isLoadingRequests } = useQuery<RedeemRequest[]>({
        queryKey: ['allRedeemRequestsForCount'],
        queryFn: () => pb.collection('redeem_requests').getFullList<RedeemRequest>({ filter: 'status = "pending"' }),
        refetchInterval: 5000,
        refetchOnMount: true
    });

    // Fetch total coupons for the dashboard
    const { data: couponData } = useQuery<PbListResult<any>>({
        queryKey: ['coupons', 1],
        queryFn: () => fetchCoupons(1),
        refetchInterval: 10000,
        refetchOnMount: true
    });

    // Fetch total companies for the dashboard
    const { data: companiesData } = useQuery<PbListResult<any>>({
        queryKey: ['companies', 1],
        queryFn: () => fetchCompanies(1),
        refetchInterval: 10000,
        refetchOnMount: true
    });

    // --- NEW: Fetch data for the statistics chart ---
    const { data: statsData, isLoading: isLoadingStats } = useQuery<StatItem[]>({
        queryKey: ['dailyCompanyStats'],
        queryFn: () => pb.collection('daily_coupons_company_stats').getFullList<StatItem>({
        }),
        refetchInterval: 30000, // Refetch stats every 30 seconds
        refetchOnMount: true
    });

    const { data: dateWiseCouponsSellStats, isLoading: isLoadingDateWiseCouponsSellStats } = useQuery<DateStatItem[]>({
        queryKey: ['dateWiseCouponsSellStats'],
        queryFn: () => pb.collection('date_wise_coupons_sell_stats').getFullList<DateStatItem>({

        }),
        refetchInterval: 30000, // Refetch stats every 30 seconds
        refetchOnMount: true
    });

    const { data: companyStatsData, isLoading: isLoadingCompanyStats } = useQuery<SellStatItem[]>({
        queryKey: ['CompanyStats'],
        queryFn: () => pb.collection('company_coupons_sell_stats').getFullList<SellStatItem>({
        }),
        refetchInterval: 30000, // Refetch stats every 30 seconds
        refetchOnMount: true
    });

    const totalUsers = userData?.totalItems ?? '...';
    const pendingRequests = pendingRequestsData?.length ?? '...';
    const totalCoupons = couponData?.totalItems ?? '...';
    const totalCompanies = companiesData?.totalItems ?? '...';

    const chartData: StatItem[] = statsData ?? [];
    const pieChartData: SellStatItem[] = companyStatsData ?? [];
    const lineChartData: DateStatItem[] = dateWiseCouponsSellStats ?? [];


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6 hidden lg:block">Admin Dashboard 📊</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Total Users card */}
                <div className="stats shadow bg-base-100 border border-primary/20">
                    <div className="stat">
                        <div className="stat-figure text-primary">
                            <Users size={32} />
                        </div>
                        <div className="stat-title">Total Users</div>
                        <div className="stat-value">{totalUsers}</div>
                    </div>
                </div>

                {/* Pending Requests card */}
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

                {/* Total Coupons card */}
                <div className="stats shadow bg-base-100 border border-secondary/20">
                    <div className="stat">
                        <div className="stat-figure text-secondary">
                            <Ticket size={32} />
                        </div>
                        <div className="stat-title">Total Coupons</div>
                        <div className="stat-value">{totalCoupons}</div>
                    </div>
                </div>

                {/* Total Companies card */}
                <div className="stats shadow bg-base-100 border border-success/20">
                    <div className="stat">
                        <div className="stat-figure text-success">
                            <Building2 size={32} />
                        </div>
                        <div className="stat-title">Total Companies</div>
                        <div className="stat-value">{totalCompanies}</div>
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl border border-base-content/10">
                <div className="card-body">
                    <h2 className="card-title text-2xl">Today's Activity</h2>
                    <p className="text-sm text-base-content/70 mb-4">
                        Daily activity from company coupons.
                    </p>

                    {/* Render loading spinner or the chart */}
                    {isLoadingStats ? (
                        <div className="h-72 flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : (
                        <CompanyStatsChart data={chartData} />
                    )}
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl border border-base-content/10">
                <div className="card-body">
                    <h2 className="card-title text-2xl">Coupons & Points Stats</h2>
                    <p className="text-sm text-base-content/70 mb-4">
                        Date wise activity from company coupons.
                    </p>

                    {/* Render loading spinner or the chart */}
                    {isLoadingDateWiseCouponsSellStats ? (
                        <div className="h-72 flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : (
                        <DateWiseStatsLineChart data={lineChartData} />
                    )}
                </div>
            </div>


            <div className="card bg-base-100 shadow-xl border border-base-content/10">
                <div className="card-body">
                    <h2 className="card-title text-2xl">Company Wise Sell Stats</h2>
                    <p className="text-sm text-base-content/70 mb-4">
                        Lifetime sell activity from company coupons.
                    </p>

                    {/* Render loading spinner or the chart */}
                    {isLoadingCompanyStats ? (
                        <div className="h-72 flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : (
                        <CompanySellStatsBarChart data={pieChartData} />
                    )}
                </div>
            </div>

        </div>
    );
}