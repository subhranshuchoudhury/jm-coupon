"use client";
// --- MODIFIED: Added 'Building' icon and 'Image/Upload' icons ---
import { Bell, Gift, QrCode, User, Building2, Image as ImageIcon, Headset } from "lucide-react";
import QRScannerModal from "./QRScannerModal";
import RedeemRequestItem from "./tabs/RedeemRequestItem";
import TransactionItem from "./tabs/TransactionItem";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteCookie, setCookie } from "cookies-next";
import pb from "@/lib/pocketbase";
import useProfileStore from "@/stores/profile.store";
import { useEffect, useState, useRef } from "react";
import { RedeemRequest, Transaction } from "../types";
import { useRouter } from "next/navigation";
// --- NEW: Import the companies modal ---
import CompaniesModal from "./CompaniesModal";
// --- MODIFIED: Import TopUsers ---
import TopUsers from "./TopUsers";
import ContactSupportModal from "./ContactSupportModal";

type HomePageProps = {
    totalPoints: number;
    transactions: Transaction[];
    redeemRequests: RedeemRequest[];
    isLoadingHistory: boolean;
    isLoadingRequests: boolean;
    onRedeemClick: () => void;
    showAlert: (message: string) => void;
};

export default function HomePage({
    totalPoints,
    transactions,
    redeemRequests,
    isLoadingHistory,
    isLoadingRequests,
    onRedeemClick,
    showAlert,
}: HomePageProps) {

    const router = useRouter();
    // --- NEW: File Input Reference ---
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { profile, updateProfile, removeProfile } = useProfileStore();

    const [manualCode, setManualCode] = useState('');
    const [activeTab, setActiveTab] = useState('recent');
    // --- New state for custom scanner modal ---
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);

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
        return response;
    };

    // --- NEW: Setup the mutation ---
    const { mutate: scanCodeMutate, isPending: isScanning } = useMutation({
        mutationFn: scanCodeApi,
        onSuccess: (data) => {
            const audio = new Audio('/success_sound.mp3');
            audio.play().catch((err) => {
                console.error('Audio playback failed:', err);
            });

            showAlert("🎉 " + (data.message || 'Code submitted successfully!'));

            queryClient.invalidateQueries({
                queryKey: ['userProfile', profile?.id],
            });

            queryClient.invalidateQueries({
                queryKey: ['transactions', profile?.id],
            });

            setManualCode('');
        },
        onError: (error: any) => {
            console.error('Scan API Error:', error);
            const errorMessage =
                error?.data?.message ||
                error.message ||
                'An unknown error occurred.';

            showAlert(errorMessage);
        },
    });

    // --- MODIFIED: Handle manual code submission ---
    const handleManualCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim() || isScanning) return;
        scanCodeMutate(manualCode);
    };

    const handleScanClick = () => {
        setIsScannerOpen(true);
    };

    // --- NEW: Handle File Upload for QR ---
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingFile(true);

        try {
            // Use the native BarcodeDetector API (Modern Browsers: Chrome, Edge, Android, macOS)
            if ('BarcodeDetector' in window) {
                // @ts-ignore - Typescript might not fully know BarcodeDetector yet depending on config
                const barcodeDetector = new window.BarcodeDetector({
                    formats: ['qr_code'],
                });

                const bitmap = await createImageBitmap(file);
                const barcodes = await barcodeDetector.detect(bitmap);

                if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    scanCodeMutate(code);
                } else {
                    showAlert("No QR code found in this image.");
                }
            } else {
                // Fallback or Alert for unsupported browsers (like older Firefox)
                showAlert("Your browser doesn't support native image scanning. Please use the camera.");
            }
        } catch (err) {
            console.error("File Scan Error", err);
            showAlert("Failed to read QR from image.");
        } finally {
            setIsProcessingFile(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- MODIFIED: Handle scan result ---
    const handleScanResult = (result: string) => {
        setIsScannerOpen(false);
        if (isScanning) return;
        scanCodeMutate(result);
    };

    const fetchProfileRefresh = async () => {
        const { record, token } = await pb.collection('users').authRefresh();

        await setCookie('pb_auth', token, {
            maxAge: 1000 * 60 * 60 * 24 * 365,
        });

        await setCookie("role", record.role ?? "user", {
            maxAge: 1000 * 60 * 60 * 24 * 365,
        });

        return {
            id: record.id,
            email: record.email,
            avatar: record.avatar,
            collectionId: record.collectionId,
            updated: record.updated,
            name: record.name,
            token,
            username: record.id,
            phone: record.phone,
            role: record.role,
            total_points: record.total_points || 0,
        };
    };

    // --- Periodic Profile Refresh ---
    const { data, isError, error } = useQuery({
        queryKey: ['userProfile', profile?.id],
        queryFn: fetchProfileRefresh,
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
        (async () => {
            if (isError && (error as any)?.status === 401) {
                pb.authStore.clear();
                removeProfile();
                await deleteCookie('pb_auth');
                await deleteCookie('role');
                router.replace('/signin');
            }
        })()
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

            {/* --- Floating Action Button for Companies --- */}
            <div className="fixed bottom-6 left-4 z-40 flex items-center gap-2">
                <button
                    className="btn btn-primary shadow-lg rounded-full"
                    title="Show Companies"
                    onClick={() =>
                        (
                            document.getElementById('companies_modal') as HTMLDialogElement
                        )?.showModal()
                    }
                >
                    <span>Companies</span>
                    <Building2 size={20} />
                </button>
            </div>

            <div className="fixed bottom-6 right-4 z-40 flex items-center gap-2">
                <button
                    className="btn btn-secondary shadow-lg rounded-full"
                    title="Contact Support"
                    onClick={() =>
                        (
                            document.getElementById('contact_support_modal') as HTMLDialogElement
                        )?.showModal()
                    }
                >
                    <span>Contact</span>
                    <Headset size={20} />
                </button>
            </div>

            {/* Main Content Area */}
            <main className="grow flex flex-col items-center p-4 pb-24"> {/* added pb-24 for scroll space */}
                <div className="w-full max-w-md">
                    {/* Points & Redeem Card */}
                    <div className="card bg-primary text-primary-content shadow-lg mb-4">
                        <div className="card-body">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="card-title opacity-80">Total Points</h2>
                                    <p className="text-4xl font-bold">
                                        {totalPoints.toLocaleString() === "0" ? "0" : totalPoints.toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={onRedeemClick}
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
                                        <input
                                            type="text"
                                            placeholder="e.g., A1B2-C3D4"
                                            className="input input-bordered join-item w-full"
                                            value={manualCode}
                                            onChange={(e) => setManualCode(e.target.value)}
                                            disabled={isScanning || isProcessingFile}
                                        />
                                        <button
                                            type="submit"
                                            className="btn btn-secondary join-item w-24"
                                            disabled={isScanning || isProcessingFile}
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

                    {/* Scan Buttons Container */}
                    <div className="flex flex-col items-center gap-4 my-6 grow">
                        {/* Main Camera Scan Button */}
                        <button
                            className="btn btn-accent btn-lg h-40 w-40 rounded-full shadow-lg flex-col gap-2"
                            onClick={handleScanClick}
                            disabled={isScanning || isProcessingFile}
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

                        {/* --- NEW: Upload from File Button --- */}
                        <div className="w-full flex justify-center">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <button
                                className="btn btn-outline btn-sm gap-2"
                                onClick={handleUploadClick}
                                disabled={isScanning || isProcessingFile}
                            >
                                {isProcessingFile ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                    <ImageIcon size={16} />
                                )}
                                Upload QR from Gallery
                            </button>
                        </div>
                    </div>

                    {/* --- NEW: Top Users Widget Integrated Here --- */}
                    <TopUsers />

                    {/* Activity Tabs Section */}
                    <div className="mt-4">
                        <div
                            role="tablist"
                            className="tabs tabs-boxed mb-3 bg-base-100/50 justify-center"
                        >
                            <a
                                role="tab"
                                className={`tab ${activeTab === 'recent' ? 'tab-active font-semibold' : ''}`}
                                onClick={() => setActiveTab('recent')}
                            >
                                My Activity
                            </a>
                            <a
                                role="tab"
                                className={`tab ${activeTab === 'requests' ? 'tab-active font-semibold' : ''}`}
                                onClick={() => setActiveTab('requests')}
                            >
                                Redeem Requests
                            </a>
                        </div>

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

            {/* --- NEW: Render the Companies Modal --- */}
            <CompaniesModal />
            <ContactSupportModal />
        </>
    );
}