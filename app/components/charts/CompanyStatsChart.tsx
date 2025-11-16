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

// Type for the raw data from PocketBase
export interface StatItem {
    id: string;
    collectionId: string;
    collectionName: string;
    date: string; // Assuming date is a string like "2025-11-16"
    company_name: string;
    total_sold: number | string; // API might send string for numbers
    total_points: number | string; // API might send string for numbers
}

// Type for the data processed for the chart
// This is the same as your original type
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

/**
 * Processes the raw data from PocketBase.
 * - Finds the most recent date in the dataset.
 * - Filters for *only* data from that date.
 * - Formats it for the company-wise chart.
 */
const processData = (data: StatItem[]): ChartDataItem[] => {
    if (!data || data.length === 0) {
        return [];
    }

    // 1. Find the most recent date in the dataset
    // We do this by reducing the array to a single string: the latest date.
    const mostRecentDate = data.reduce((max, item) =>
        (item.date > max ? item.date : max),
        data[0].date // Start with the first item's date as the initial max
    );

    // 2. Filter data to only include items from that most recent date
    const recentData = data.filter(item => item.date === mostRecentDate);

    // 3. Process the filtered data (convert numbers and capitalize names)
    return recentData.map(item => ({
        date: item.date,
        // Capitalize company name for display
        company_name: item.company_name.charAt(0).toUpperCase() + item.company_name.slice(1),
        total_sold: Number(item.total_sold) || 0,
        total_points: Number(item.total_points) || 0,
    }));
};

const CompanyStatsChart: FC<CompanyStatsChartProps> = ({ data }) => {
    const processedData = processData(data);

    // Get the date we are showing stats for, to use in the title
    const chartDate = processedData.length > 0 ? processedData[0].date : null;

    if (!processedData || processedData.length === 0) {
        return (
            <div className="h-72 flex items-center justify-center text-base-content/50">
                No statistics data to display.
            </div>
        );
    }

    return (
        // Recharts needs a parent with a defined height to be responsive.
        <div style={{ width: '100%' }}>
            {/* Added a title to show which date is being displayed */}
            {chartDate && (
                <h3 className="text-lg font-semibold text-center mb-2">
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

                        {/* CHANGED: The X-axis now shows the company_name */}
                        <XAxis dataKey="company_name" fontSize={12} />

                        <YAxis />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1d232a', borderRadius: '8px' }}
                        />
                        <Legend />

                        {/* These bars will now be grouped by company */}
                        <Bar dataKey="total_sold" fill="#8884d8" name="Total Sold" />
                        <Bar dataKey="total_points" fill="#82ca9d" name="Total Points" />

                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default CompanyStatsChart;