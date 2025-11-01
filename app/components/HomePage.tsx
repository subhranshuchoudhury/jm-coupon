"use client";
import { Bell, Gift, QrCode, User } from "lucide-react";
import QRScannerModal from "./QRScannerModal";
import RedeemRequestItem from "./tabs/RedeemRequestItem";
import TransactionItem from "./tabs/TransactionItem";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteCookie, setCookie } from "cookies-next";
import pb from "@/lib/pocketbase";
import useProfileStore from "@/stores/profile.store";
import { useEffect, useState } from "react";
import { RedeemRequest, Transaction } from "../types";
import { useRouter } from "next/navigation";

type HomePageProps = {
    totalPoints: number;
    transactions: Transaction[];
    redeemRequests: RedeemRequest[];
    isLoadingHistory: boolean; // Added prop
    isLoadingRequests: boolean; // Added prop
    onRedeemClick: () => void;
    showAlert: (message: string) => void;
};

export default function HomePage({
    totalPoints, // Use totalPoints prop
    transactions,
    redeemRequests,
    isLoadingHistory, // Destructure prop
    isLoadingRequests, // Destructure prop
    onRedeemClick,
    showAlert,
}: HomePageProps) {

    const router = useRouter();

    const { profile, updateProfile, removeProfile } = useProfileStore();

    const [manualCode, setManualCode] = useState('');
    const [activeTab, setActiveTab] = useState('recent');
    // --- New state for custom scanner modal ---
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // --- NEW: Get Query Client ---
    const queryClient = useQueryClient();

    // --- NEW: Define the API call function ---
    const scanCodeApi = async (code: string) => {
        const response = await pb.send('/api/v1/scan', {
            method: 'POST',
            body: JSON.stringify({ code: code }),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // This function will either return response data on 2xx...
        // or throw an error on 4xx/5xx (which useMutation's onError will catch)
        return response;
    };

    // --- NEW: Setup the mutation ---
    const { mutate: scanCodeMutate, isPending: isScanning } = useMutation({
        mutationFn: scanCodeApi,
        onSuccess: (data) => {
            // This is a true success (HTTP 2xx)

            // 'data' is the response body
            const audio = new Audio('/success_sound.mp3'); // Adjust path if needed
            audio.play().catch((err) => {
                console.error('Audio playback failed:', err);
            });

            showAlert("🎉" + data.message || 'Code submitted successfully!');
            // Refetch the user's profile to update points
            queryClient.invalidateQueries({
                queryKey: ['userProfile', profile?.id],
            });
            // --- ALSO REFETCH TRANSACTIONS ---
            queryClient.invalidateQueries({
                queryKey: ['transactions', profile?.id],
            });
        },
        onError: (error: any) => {
            // This is a network error or HTTP 4xx/5xx
            console.error('Scan API Error:', error);

            // The error object from pb.send has the JSON response in `error.data`
            // This will show messages like "Coupon code not found."
            const errorMessage =
                error?.data?.message || // For PocketBase ClientResponseError
                error.message || // For generic errors
                'An unknown error occurred.';

            showAlert(errorMessage);
        },
        onSettled: () => {
            // This runs after success OR error
            setManualCode(''); // Clear the manual code input regardless
        },
    }
    );

    // --- MODIFIED: Handle manual code submission ---
    const handleManualCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim() || isScanning) return; // Prevent if empty or loading
        scanCodeMutate(manualCode);
    };

    const handleScanClick = () => {
        // --- Open custom modal instead of alert ---
        setIsScannerOpen(true);
    };

    // --- MODIFIED: Handle scan result ---
    const handleScanResult = (result: string) => {
        setIsScannerOpen(false);
        if (isScanning) return; // Prevent if already scanning
        // Don't show alert here, the mutation will handle it
        scanCodeMutate(result);
    };

    const fetchProfileRefresh = async () => {
        const { record, token } = await pb.collection('users').authRefresh();

        await setCookie('pb_auth', token, {
            maxAge: 1000 * 60 * 60 * 24 * 365, // 365 days
        });

        return {
            total_points: record.total_points || 0,
            email: record.email,
            name: record.name,
            id: record.id,
            role: record.role,
        };
    };

    // --- Periodic Profile Refresh ---
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['userProfile', profile?.id],
        queryFn: fetchProfileRefresh,
        // enabled: !!pb.authStore.token,
        retryDelay: 5000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: 10000,
    });


    useEffect(() => {
        if (data) {
            updateProfile(data);
        }
    }, [data]);

    useEffect(() => {
        // Guard against different error shapes by using a type assertion / runtime check
        if (isError && (error as any)?.status === 401) {
            pb.authStore.clear();
            removeProfile();
            deleteCookie('pb_auth');
            deleteCookie('role');
            router.replace('/signin');
        }
    }, [isError, error]);

    return (
        <>
            {/* Top Navigation Bar */}
            <div className="navbar bg-base-100 shadow-sm sticky top-0 z-50">
                <div className="flex-1">
                    <a className="btn btn-ghost text-xl normal-case">Jyeshtha Motors</a>
                </div>
                <div className="flex-none">
                    <button
                        className="btn btn-ghost btn-circle"
                        onClick={() =>
                            (
                                document.getElementById('notification_modal') as HTMLDialogElement
                            )?.showModal()
                        }
                    >
                        <div className="indicator">
                            <Bell size={20} />
                            <span className="badge badge-xs badge-primary indicator-item"></span>
                        </div>
                    </button>
                    <button
                        className="btn btn-ghost btn-circle"
                        onClick={() =>
                            (
                                document.getElementById('profile_modal') as HTMLDialogElement
                            )?.showModal()
                        }
                    >
                        <User size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="grow flex flex-col items-center p-4">
                <div className="w-full max-w-md">
                    {/* Points & Redeem Card */}
                    <div className="card bg-primary text-primary-content shadow-lg mb-4">
                        <div className="card-body">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="card-title opacity-80">Total Points</h2>
                                    <p className="text-4xl font-bold">
                                        {/* --- Read from prop --- */}
                                        {totalPoints.toLocaleString() === "0" ? isLoading ? "..." : "0" : totalPoints.toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={onRedeemClick} // Updated to open modal
                                >
                                    <Gift size={18} className="mr-1" />
                                    Redeem
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Manual Code Entry Card */}
                    <div className="card bg-base-100 shadow-md mb-6">
                        <div className="card-body p-4">
                            <form onSubmit={handleManualCodeSubmit}>
                                <div className="form-control">
                                    <label className="label pt-0">
                                        <span className="label-text">Enter Code Manually</span>
                                    </label>
                                    <div className="join w-full">
                                        {/* --- MODIFIED INPUT --- */}
                                        <input
                                            type="text"
                                            placeholder="e.g., A1B2-C3D4"
                                            className="input input-bordered join-item w-full"
                                            value={manualCode}
                                            onChange={(e) => setManualCode(e.target.value)}
                                            disabled={isScanning}
                                        />
                                        {/* --- MODIFIED BUTTON --- */}
                                        <button
                                            type="submit"
                                            className="btn btn-secondary join-item w-24"
                                            disabled={isScanning}
                                        >
                                            {isScanning ? (
                                                <span className="loading loading-spinner"></span>
                                            ) : (
                                                'Submit'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Scan Button (Main CTA) */}
                    <div className="text-center my-6 grow">
                        {/* --- MODIFIED BUTTON --- */}
                        <button
                            className="btn btn-accent btn-lg h-40 w-40 rounded-full shadow-lg flex-col gap-2"
                            onClick={handleScanClick} // Updated
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <span className="loading loading-spinner loading-lg"></span>
                            ) : (
                                <>
                                    <QrCode size={48} />
                                    <span className="text-lg">Scan Code</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Activity Tabs Section */}
                    <div className="mt-4">
                        {/* --- Updated Tab List --- */}
                        <div
                            role="tablist"
                            className="tabs tabs-boxed mb-3 bg-base-100/50 justify-center"
                        >
                            <a
                                role="tab"
                                className={`tab ${activeTab === 'recent' ? 'tab-active font-semibold' : ''
                                    }`}
                                onClick={() => setActiveTab('recent')}
                            >
                                My Activity
                            </a>
                            {/* --- New Tab --- */}
                            <a
                                role="tab"
                                className={`tab ${activeTab === 'requests' ? 'tab-active font-semibold' : ''
                                    }`}
                                onClick={() => setActiveTab('requests')}
                            >
                                Redeem Requests
                            </a>
                        </div>

                        {/* --- MODIFIED Tab Panels with Loading States --- */}
                        <div className="bg-base-100 rounded-box shadow-md overflow-hidden min-h-[150px]">
                            {/* --- Tab Panel for 'My Activity' --- */}
                            {activeTab === 'recent' && (
                                <>
                                    {isLoadingHistory ? (
                                        <div className="p-6 text-center">
                                            <span className="loading loading-spinner"></span>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-base-200">
                                            {transactions.length > 0 ? (
                                                transactions.map((tx) => (
                                                    <TransactionItem key={tx.id} transaction={tx} />
                                                ))
                                            ) : (
                                                <li className="p-6 text-center text-base-content/70">
                                                    You have no activity yet.
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </>
                            )}

                            {/* --- Tab Panel for 'Redeem Requests' --- */}
                            {activeTab === 'requests' && (
                                <>
                                    {isLoadingRequests ? (
                                        <div className="p-6 text-center">
                                            <span className="loading loading-spinner"></span>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-base-200">
                                            {redeemRequests.length > 0 ? (
                                                redeemRequests.map((req) => (
                                                    <RedeemRequestItem key={req.id} request={req} />
                                                ))
                                            ) : (
                                                <li className="p-6 text-center text-base-content/70">
                                                    You have no redemption requests.
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* --- NEW QR SCANNER MODAL --- */}
            {isScannerOpen && (
                <QRScannerModal
                    onClose={() => setIsScannerOpen(false)}
                    onScan={handleScanResult}
                />
            )}
        </>
    );
}