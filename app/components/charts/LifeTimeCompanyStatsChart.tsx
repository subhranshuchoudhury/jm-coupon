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
    ResponsiveContainer
} from 'recharts';

// Type for the raw data
export interface SellStatItem {
    id: string;
    collectionId: string;
    collectionName: string;
    company_name: string;
    total_coupons_sold: number | string; // Allow for string/number from API
    total_points: number | string; // Allow for string/number from API
}

// Type for the data processed for the chart
interface ChartDataItem {
    company_name: string;
    total_coupons_sold: number;
    total_points: number; // We still process it, so tooltip can use it
}

// Type for the component's props
interface CompanySellStatsBarChartProps {
    data: SellStatItem[];
}

/**
 * Processes the raw data:
 * - Ensures numeric values are numbers, not strings.
 * - Capitalizes company names for display.
 */
const processData = (data: SellStatItem[]): ChartDataItem[] => {
    return data.map(item => ({
        // Capitalize first letter for a cleaner look
        company_name: item.company_name.charAt(0).toUpperCase() + item.company_name.slice(1),
        total_coupons_sold: Number(item.total_coupons_sold) || 0,
        total_points: Number(item.total_points) || 0,
    }));
};

/**
 * A custom tooltip to show both coupons sold and total points on hover.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // payload[0].payload contains the original data object for the bar
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
                {/* We can still show total_points in the tooltip */}
                <p className="text-sm" style={{ color: '#ccc' }}>
                    Total Points: {data.total_points}
                </p>
            </div>
        );
    }
    return null;
};

/**
 * Renders a bar chart showing coupons sold by company.
 */
const CompanySellStatsBarChart: FC<CompanySellStatsBarChartProps> = ({ data }) => {
    const processedData = processData(data);

    if (!processedData || processedData.length === 0) {
        return (
            <div className="h-72 flex items-center justify-center text-base-content/50">
                No sales data to display.
            </div>
        );
    }

    return (
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

                    {/* The X-axis shows the company name */}
                    <XAxis dataKey="company_name" fontSize={12} />

                    <YAxis />

                    {/* Use the custom tooltip to show extra info */}
                    <Tooltip content={<CustomTooltip />} />

                    <Legend />

                    {/* Bar for Coupons Sold */}

                    <Bar
                        dataKey="total_coupons_sold"
                        fill="#8884d8"
                        name="Coupons Sold"
                    />

                    {/* REMOVED: The bar for total_points is no longer here */}
                    {/* <Bar ... /> */}

                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default CompanySellStatsBarChart;