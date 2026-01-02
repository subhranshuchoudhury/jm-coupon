"use client";
import { fetchCompanies, fetchUsers } from "@/apis/api";
import pb from "@/lib/pocketbase";
import { useQuery } from "@tanstack/react-query";
import { Building2, Gift, Ticket, Users, CheckCircle, Layers, TrendingUp, TrendingDown } from "lucide-react";
// Import the new chart component and its type
import type { RecordModel } from "pocketbase";
import CompanyStatsChart, { StatItem } from "../../charts/DailyCompanyStatsChart";
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

interface CouponStats extends RecordModel {
    total_coupons: number;
    redeemed_coupons: number;
    available_coupons: number;
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

    // Fetch total coupons for the dashboard (Legacy/Alternative source)
    // const { data: couponData } = useQuery<PbListResult<any>>({
    //     queryKey: ['coupons', 1],
    //     queryFn: () => fetchCoupons(1),
    //     refetchInterval: 10000,
    //     refetchOnMount: true
    // });

    // --- NEW: Fetch aggregated coupon stats ---
    const { data: couponStats, isLoading: isLoadingCouponStats } = useQuery<CouponStats>({
        queryKey: ['coupons_stats_dashboard'],
        queryFn: () => pb.collection('coupons_stats_dashboard').getOne<CouponStats>('1'),
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
    // const totalCoupons = couponData?.totalItems ?? '...'; // Old logic
    const totalCompanies = companiesData?.totalItems ?? '...';

    const chartData: StatItem[] = statsData ?? [];
    const pieChartData: SellStatItem[] = companyStatsData ?? [];
    const lineChartData: DateStatItem[] = dateWiseCouponsSellStats ?? [];

    // --- Calculate Today's Total Sold and Trend ---
    let todaysTotalSold = 0;
    let yesterdaysTotalSold = 0;
    let trendPercentage = 0;
    let isTrendingUp = true;
    let isTrendNeutral = true;

    if (chartData.length > 0) {
        // 1. Calculate Today's Sold from 'dailyCompanyStats' (chartData)
        //    Find the max date in that dataset
        const mostRecentDate = chartData.reduce((max, item) =>
            (item.date > max ? item.date : max),
            chartData[0].date
        );
        const recentData = chartData.filter(item => item.date === mostRecentDate);
        todaysTotalSold = recentData.reduce((sum, item) => sum + Number(item.total_sold || 0), 0);

        // 2. Calculate Yesterday's Sold from 'dateWiseCouponsSellStats' (lineChartData)
        //    This gives us the historical context per day.
        if (lineChartData.length > 0) {
            // Sort by date just to be sure
            const sortedHistory = [...lineChartData]
                .filter(item => item.date !== null && item.date !== '')
                .sort((a, b) => a.date!.localeCompare(b.date!));

            // Find the entry for 'mostRecentDate' or the day before
            const todayIndex = sortedHistory.findIndex(item => item.date === mostRecentDate);

            if (todayIndex > 0) {
                // If today is found and there is a previous day
                const prevDayItem = sortedHistory[todayIndex - 1];
                yesterdaysTotalSold = Number(prevDayItem.total_coupons_sold || 0);
            } else if (todayIndex === -1 && sortedHistory.length > 0) {
                // If today is NOT in the history list yet (unlikely if they sync, but possible),
                // maybe the last item in history is yesterday?
                // For safety, let's assume if we can't match dates, we might skip trend or use last available.
                // But typically, 'dateWiseCouponsSellStats' should contain today's entry too if updated.
                // Let's rely on finding todayIndex.

                // Fallback: If today's index is 0, we have no previous data in this list.
            }

            if (yesterdaysTotalSold > 0) {
                const diff = todaysTotalSold - yesterdaysTotalSold;
                trendPercentage = (Math.abs(diff) / yesterdaysTotalSold) * 100;
                isTrendingUp = diff >= 0;
                isTrendNeutral = diff === 0;
            } else if (todaysTotalSold > 0) {
                // Yesterday was 0, Today is > 0 -> 100% increase (technically infinite, but treated as new growth)
                trendPercentage = 100;
                isTrendingUp = true;
                isTrendNeutral = false;
            }
        }
    }


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

                {/* Available Coupons card */}
                <div className="stats shadow bg-base-100 border border-accent/20">
                    <div className="stat">
                        <div className="stat-figure text-accent">
                            <Layers size={32} />
                        </div>
                        <div className="stat-title">Available Coupons</div>
                        <div className="stat-value">
                            {isLoadingCouponStats ? <span className="loading loading-spinner loading-sm"></span> : (couponStats?.available_coupons ?? '...')}
                        </div>
                    </div>
                </div>

                {/* Redeemed Coupons card */}
                <div className="stats shadow bg-base-100 border border-info/20">
                    <div className="stat">
                        <div className="stat-figure text-info">
                            <CheckCircle size={32} />
                        </div>
                        <div className="stat-title">Redeemed Coupons</div>
                        <div className="stat-value">
                            {isLoadingCouponStats ? <span className="loading loading-spinner loading-sm"></span> : (couponStats?.redeemed_coupons ?? '...')}
                        </div>
                    </div>
                </div>

                {/* Total Coupons card */}
                <div className="stats shadow bg-base-100 border border-secondary/20">
                    <div className="stat">
                        <div className="stat-figure text-secondary">
                            <Ticket size={32} />
                        </div>
                        <div className="stat-title">Total Coupons</div>
                        <div className="stat-value">
                            {isLoadingCouponStats ? <span className="loading loading-spinner loading-sm"></span> : (couponStats?.total_coupons ?? '...')}
                        </div>
                    </div>
                </div>

                {/* Today's Coupons Sold card */}
                <div className={`stats shadow bg-base-100 border ${isTrendingUp ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                    <div className="stat">
                        <div className={`stat-figure ${isTrendingUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isTrendingUp ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                        </div>
                        <div className="stat-title">Today's Sold</div>
                        <div className="stat-value">
                            {isLoadingStats ? <span className="loading loading-spinner loading-sm"></span> : todaysTotalSold}
                        </div>
                        <div className={`stat-desc flex items-center gap-1 ${isTrendingUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isTrendNeutral ? (
                                <span>Same as yesterday</span>
                            ) : (
                                <>
                                    <span>{trendPercentage.toFixed(1)}%</span>
                                    <span>{isTrendingUp ? 'more' : 'less'} than yesterday</span>
                                </>
                            )}
                        </div>
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