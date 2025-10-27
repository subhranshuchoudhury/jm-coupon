"use client";
import { manualPointGrant } from "@/apis/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QrCode } from "lucide-react";
import { useState } from "react";

export default function ScanCouponView() {
    const [couponCode, setCouponCode] = useState('');
    const [points, setPoints] = useState(0);
    const [userId, setUserId] = useState('');
    const [message, setMessage] = useState('');
    const queryClient = useQueryClient();

    // Mutation for manual point injection (using the new manualPointGrant function)
    const manualPointsMutation = useMutation({
        mutationFn: manualPointGrant,
        onSuccess: () => {
            setMessage('Points successfully granted! User data might take a moment to refresh.');
            setCouponCode('');
            setPoints(0);
            setUserId('');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setTimeout(() => setMessage(''), 5000);
        },
        onError: (error: Error) => {
            setMessage(`Error granting points: ${error.message}`);
            setTimeout(() => setMessage(''), 10000);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!couponCode || points <= 0 || !userId) {
            setMessage('Please enter a valid code, points value, and a Target User ID.');
            return;
        }

        manualPointsMutation.mutate({
            userId,
            points,
            code: couponCode,
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6 hidden lg:block">Scan or Enter Coupon 🔑</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Manual Entry */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title text-2xl">Manual Point / Coupon Assignment</h2>
                        <p className="text-sm text-base-content/70">Manually assign a point value and identifier to a specific user via their PocketBase ID.</p>

                        {message && (
                            <div className={`alert ${manualPointsMutation.isSuccess ? 'alert-success' : manualPointsMutation.isError ? 'alert-error' : 'alert-info'} mt-4`}>
                                {message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text font-semibold">Coupon Code/Identifier (For Log)</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g., ADMIN_GRANT_2025"
                                    className="input input-bordered w-full"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text font-semibold">Points Value</span></label>
                                <input
                                    type="number"
                                    placeholder="e.g., 100"
                                    className="input input-bordered w-full"
                                    value={points}
                                    onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
                                    required
                                    min="1"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text font-semibold">Target User ID (PocketBase ID)</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g., df2iub1g99ls990"
                                    className="input input-bordered w-full font-mono"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="card-actions justify-end">
                                <button className="btn btn-primary" type="submit" disabled={manualPointsMutation.isPending}>
                                    {manualPointsMutation.isPending ? 'Processing...' : 'Submit Code & Grant Points'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* QR Scanner Placeholder */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title text-2xl">QR Code Scanner (Mobile)</h2>
                        <p className="text-sm text-base-content/70">Use this on a mobile device to quickly scan and apply physical coupons or QR codes generated from the system.</p>
                        <div className="flex flex-col items-center justify-center min-h-64 rounded-lg bg-base-200 border border-dashed border-base-content/30 mt-4 p-4">
                            <QrCode size={64} className="text-base-content/30" />
                            <p className="text-base-content/60 mt-4 text-center">
                                Integration with a library like `react-qr-reader` is required here.
                            </p>
                            <button className="btn btn-accent mt-6" disabled>
                                Start Camera
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}