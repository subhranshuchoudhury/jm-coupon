import { RedeemRequest } from "@/app/types";
import { AlertCircle, CheckCircle, ChevronRight, Gift, XCircle } from "lucide-react";

export default function RedeemRequestItem({ request }: { request: RedeemRequest }) {
    let StatusIcon: React.ElementType;
    let statusColorClass: string;

    switch (request.status) {
        case 'approved':
            StatusIcon = CheckCircle;
            statusColorClass = 'badge-success';
            break;
        case 'rejected':
            StatusIcon = XCircle;
            statusColorClass = 'badge-error';
            break;
        case 'pending':
        default:
            StatusIcon = AlertCircle;
            statusColorClass = 'badge-warning';
            break;
    }

    return (
        <li className="p-4 hover:bg-base-200 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                    <div className="mr-3 p-2 rounded-full bg-primary/10">
                        <Gift size={20} className="text-primary" />
                    </div>
                    <div>
                        <p className="font-semibold text-base-content">{request.title}</p>
                        <p className="text-sm text-base-content/70">{request.date}</p>
                    </div>
                </div>
                <div className="flex items-center">
                    <span className="font-bold mr-2 text-error">
                        -{request.points.toLocaleString()}
                    </span>
                    <ChevronRight size={18} className="text-base-content/30" />
                </div>
            </div>
            <div className="pl-12">
                <div className={`badge ${statusColorClass} gap-1.5`}>
                    <StatusIcon size={14} />
                    {request.status}
                </div>
                {request.message && (
                    <p className="text-sm text-base-content/80 mt-1.5">
                        {request.message}
                    </p>
                )}
            </div>
        </li>
    );
}