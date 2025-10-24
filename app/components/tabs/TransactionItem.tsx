"use client";

import { Transaction } from "@/app/types";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";

export default function TransactionItem({ transaction }: { transaction: Transaction }) {
    const isEarn = transaction.type === 'earn';
    const pointsColor = isEarn ? 'text-success' : 'text-error';
    const Icon = isEarn ? TrendingUp : TrendingDown;

    return (
        <li className="flex items-center justify-between p-4 hover:bg-base-200 transition-colors">
            <div className="flex items-center">
                <div
                    className={`mr-3 p-2 rounded-full ${isEarn ? 'bg-success/10' : 'bg-error/10'
                        }`}
                >
                    <Icon size={20} className={isEarn ? 'text-success' : 'text-error'} />
                </div>
                <div>
                    <p className="font-semibold text-base-content">{transaction.title}</p>
                    <p className="text-sm text-base-content/70">{transaction.date}</p>
                </div>
            </div>
            <div className="flex items-center">
                <span className={`font-bold mr-2 ${pointsColor}`}>
                    {isEarn ? '+' : ''}
                    {transaction.points}
                </span>
                <ChevronRight size={18} className="text-base-content/30" />
            </div>
        </li>
    );
}