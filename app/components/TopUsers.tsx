"use client";

import { fetchTopUsers } from "@/apis/api";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { useState } from "react";

export default function TopUsers() {
    const [isExpanded, setIsExpanded] = useState(false);

    const { data: topUsers, isLoading, isError } = useQuery({
        queryKey: ['topUsers'],
        queryFn: fetchTopUsers,
    });

    if (isLoading) {
        return (
            <div className="card bg-base-100 shadow-md mt-6 p-6 flex justify-center items-center">
                <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
        );
    }

    if (isError || !topUsers || topUsers.length === 0) {
        return null; // Hide gracefully on error or empty
    }

    const topThree = topUsers.slice(0, 3);
    const restUsers = topUsers.slice(3);

    const getRankStyles = (index: number) => {
        switch (index) {
            case 0: return "bg-yellow-50 border-yellow-200 text-yellow-700";
            case 1: return "bg-gray-50 border-gray-200 text-gray-600";
            case 2: return "bg-orange-50 border-orange-200 text-orange-700";
            default: return "bg-base-100 border-base-200";
        }
    };

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Crown size={20} className="text-yellow-500 fill-yellow-500" />;
            case 1: return <Medal size={20} className="text-gray-400" />;
            case 2: return <Medal size={20} className="text-orange-400" />;
            default: return <span className="font-bold text-xs text-base-content/50">#{index + 1}</span>;
        }
    };

    return (
        <div className="card bg-base-100 shadow-md mt-6 w-full">
            <div className="card-body p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="text-primary" size={20} />
                    <h3 className="font-bold text-lg">Top Performers</h3>
                </div>

                {/* Top 3 List */}
                <div className="flex flex-col gap-3">
                    {topThree.map((user, index) => (
                        <div
                            key={user.id}
                            className={`flex items-center p-3 rounded-xl border ${getRankStyles(index)} shadow-sm`}
                        >
                            <div className="flex-none w-8 flex justify-center">
                                {getRankIcon(index)}
                            </div>
                            <div className="grow px-2">
                                <p className="font-bold text-sm truncate">{user.name}</p>
                            </div>
                            {/* <div className="font-mono font-bold text-sm opacity-80">
                                {user.total_points.toLocaleString()} pts
                            </div> */}
                        </div>
                    ))}
                </div>

                {/* Collapsible List (Rank 4+) */}
                {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-base-200 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        {restUsers.map((user, index) => (
                            <div key={user.id} className="flex items-center p-2 hover:bg-base-200 rounded-lg transition-colors">
                                <div className="flex-none w-8 flex justify-center font-mono text-xs text-base-content/50 font-bold">
                                    #{index + 4}
                                </div>
                                <div className="grow px-2">
                                    <p className="text-sm font-medium">{user.name}</p>
                                </div>
                                {/* <div className="text-xs font-mono text-base-content/70">
                                    {user.total_points.toLocaleString()}
                                </div> */}
                            </div>
                        ))}

                        {restUsers.length === 0 && (
                            <p className="text-center text-xs text-base-content/50 py-2">No other users yet.</p>
                        )}
                    </div>
                )}

                {/* Show More / Less Button */}
                {restUsers.length > 0 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="btn btn-ghost btn-xs w-full mt-2 gap-1 text-base-content/60 hover:text-base-content"
                    >
                        {isExpanded ? (
                            <>Show Less <ChevronUp size={14} /></>
                        ) : (
                            <>View All Leaders <ChevronDown size={14} /></>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}