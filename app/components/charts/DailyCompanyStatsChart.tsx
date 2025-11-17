"use client";
import type { FC } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    TooltipProps
} from 'recharts';

// Type for the raw data from PocketBase
export interface StatItem {
    id: string;
    collectionId: string;
    collectionName: string;
    date: string;
    company_name: string;
    total_sold: number | string;
    total_points: number | string;
}

// Type for the data processed for the chart
interface ChartDataItem {
    date: string;
    company_name: string;
    total_sold: number;
    total_points: number;
}

// Type for the component's props
interface CompanyStatsChartProps {
    data: StatItem[];
}

// --- Custom Tooltip Component ---
// This allows us to show data (Total Points) that isn't actually rendered as a bar
//@ts-ignore
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        // payload[0].payload holds the full data object for this specific bar
        const data = payload[0].payload as ChartDataItem;

        return (
            <div className="bg-[#1d232a] p-3 rounded-lg border border-gray-700 shadow-lg text-sm">
                <p className="font-bold text-white mb-2">{label}</p>
                {/* Show Total Sold */}
                <p style={{ color: '#82ca9d' }}>
                    Total Sold: <span className="font-semibold">{data.total_sold}</span>
                </p>
                {/* Show Total Points (even though there is no bar for it) */}
                <p style={{ color: '#8884d8' }}>
                    Total Points: <span className="font-semibold">{data.total_points}</span>
                </p>
            </div>
        );
    }
    return null;
};

const processData = (data: StatItem[]): ChartDataItem[] => {
    if (!data || data.length === 0) {
        return [];
    }

    const mostRecentDate = data.reduce((max, item) =>
        (item.date > max ? item.date : max),
        data[0].date
    );

    const recentData = data.filter(item => item.date === mostRecentDate);

    return recentData.map(item => ({
        date: item.date,
        company_name: item.company_name.charAt(0).toUpperCase() + item.company_name.slice(1),
        total_sold: Number(item.total_sold) || 0,
        total_points: Number(item.total_points) || 0,
    }));
};

const CompanyStatsChart: FC<CompanyStatsChartProps> = ({ data }) => {
    const processedData = processData(data);
    const chartDate = processedData.length > 0 ? processedData[0].date : null;

    if (!processedData || processedData.length === 0) {
        return (
            <div className="h-72 flex items-center justify-center text-base-content/50">
                No statistics data to display.
            </div>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            {chartDate && (
                <h3 className="text-md font-semibold text-center mb-2">
                    Daily Stats for {chartDate}
                </h3>
            )}

            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={processedData}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="company_name" fontSize={12} />
                        <YAxis />

                        {/* Use the CustomTooltip here */}
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />

                        <Legend />

                        {/* ONLY render the Total Sold Bar */}
                        <Bar dataKey="total_sold" fill="#82ca9d" name="Total Sold" />

                        {/* "Total Points" Bar has been removed, but the data is still accessible 
                            via the CustomTooltip because it exists in 'processedData' */}

                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default CompanyStatsChart;