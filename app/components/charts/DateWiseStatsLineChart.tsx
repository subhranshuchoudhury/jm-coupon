"use client";
import type { FC } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

// Type for the raw data
export interface DateStatItem {
    id: string;
    collectionId: string;
    collectionName: string;
    date: string | null; // API can send null for date
    total_coupons_sold: number | string;
    total_points: number | string;
}

// Type for the data processed for the chart
interface ChartDataItem {
    date: string;
    total_coupons_sold: number;
    total_points: number;
}

// Type for the component's props
interface DateWiseStatsLineChartProps {
    data: DateStatItem[];
}

/**
 * Processes the raw data for the line chart:
 * - Filters out any entries with a null date.
 * - Ensures numeric values are numbers.
 * - Sorts the data by date in ascending order (required for line charts).
 */
const processData = (data: DateStatItem[]): ChartDataItem[] => {
    return data
        // 1. Filter out any items that don't have a valid date
        .filter(item => item.date !== null && item.date !== '')
        // 2. Map to the format for the chart
        .map(item => ({
            date: item.date!, // We know date is not null here
            total_coupons_sold: Number(item.total_coupons_sold) || 0,
            total_points: Number(item.total_points) || 0,
        }))
        // 3. Sort by date (ascending) so the line connects in order
        .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * A custom tooltip to show both coupons sold and total points on hover.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // payload[0].payload contains the original data object for the point
        const data = payload[0].payload;

        return (
            <div
                className="p-3 rounded-lg shadow-lg"
                style={{ backgroundColor: '#1d232a', border: '1px solid #444' }}
            >
                <p className="font-bold mb-1" style={{ color: '#fff' }}>
                    {label}
                </p>
                <p className="text-sm" style={{ color: payload[0].color }}>
                    Coupons Sold: {data.total_coupons_sold}
                </p>
                <p className="text-sm" style={{ color: '#ccc' }}>
                    Total Points: {data.total_points}
                </p>
            </div>
        );
    }
    return null;
};

/**
 * Renders a line chart for date-wise coupon statistics.
 */
const DateWiseStatsLineChart: FC<DateWiseStatsLineChartProps> = ({ data }) => {
    const processedData = processData(data);

    if (!processedData || processedData.length === 0) {
        return (
            <div className="h-72 flex items-center justify-center text-base-content/50">
                No time-series data to display.
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={processedData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                    {/* X-axis displays the date */}
                    <XAxis dataKey="date" fontSize={12} />

                    <YAxis />

                    {/* Use the custom tooltip we defined above */}
                    <Tooltip content={<CustomTooltip />} />

                    <Legend />

                    {/* Line for Coupons Sold */}
                    <Line
                        type="monotone"
                        dataKey="total_coupons_sold"
                        name="Coupons Sold"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                    />

                    {/* REMOVED: The line for Total Points is no longer here */}

                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default DateWiseStatsLineChart;