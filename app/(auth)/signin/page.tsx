"use client";
import pb from "@/lib/pocketbase";
import { useState } from "react";
import { setCookie } from 'cookies-next';
import { useRouter } from "next/navigation";
import useProfileStore from "@/stores/profile.store";

// A small component to inject the necessary custom CSS for animations
// and the glassmorphism effects. This keeps everything in one file.
const CustomStyles = () => (
    <style jsx global>{`
        /* Keyframe animation for floating */
        @keyframes float {
            0%, 100% {
                transform: translateY(0px) rotate(-10deg);
            }
            50% {
                transform: translateY(-40px) rotate(10deg);
            }
        }

        /* Base styles for the glassmorphism coins */
        .coin {
            position: absolute;
            border-radius: 50%;
            /* The glassmorphism effect */
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
            will-change: transform; /* Optimize for animation */
            z-index: 1;
        }

        /* Custom text shadow for the logo */
        .text-shadow-custom {
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        /* Apply animations with different durations and delays */
        .animate-float-1 { animation: float 12s ease-in-out infinite; }
        .animate-float-2 { animation: float 15s ease-in-out infinite 3s; }
        .animate-float-3 { animation: float 10s ease-in-out infinite 1s; }
        .animate-float-4 { animation: float 18s ease-in-out infinite 5s; }
        .animate-float-5 { animation: float 14s ease-in-out infinite 2s; }
        .animate-float-6 { animation: float 11s ease-in-out infinite 4s; }
    `}</style>
);

export default function SignInForm() {
    const { setProfile } = useProfileStore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await pb.collection("users").authWithOAuth2({
                provider: "google",
            });

            if (pb.authStore.record?.id) {
                await pb.collection('users').update(pb.authStore.record.id, {
                    emailVisibility: true,
                });
            }

            if (process.env.NODE_ENV === "development") {
                console.log("Auth valid:", pb.authStore.isValid);
                console.log("Auth token:", pb.authStore.token);
                console.log("Auth Record", pb.authStore.record);
            }

            const cookieString = pb.authStore.token;
            const record = pb.authStore.record;
            if (record) {
                setProfile({
                    uid: record.id,
                    email: record.email,
                    avatar: record.avatar,
                    avatarCollectionId: record.collectionId,
                    updated: record.updated,
                    name: record.name,
                    token: pb.authStore.token,
                    username: record.id,
                    phone: record.phone,
                    role: record.role,
                    total_points: record.total_points || 0,
                });

                await setCookie("pb_auth", cookieString, {
                    maxAge: 1000 * 60 * 60 * 24 * 365, // 365 days
                });
                await setCookie("role", record.role ? record.role : "user", {
                    maxAge: 1000 * 60 * 60 * 24 * 365, // 365 days
                });

                router.refresh();
            }
        } catch (err) {
            console.error("Google Sign-In Error:", err);
            setError("Failed to sign in with Google. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* This component injects the keyframes and coin styles */}
            <CustomStyles />

            {/* Main container with gradient and relative positioning */}
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-600 to-purple-700 font-sans">
                
                {/* Background Coins Container */}
                <div className="absolute inset-0 w-full h-full z-0">
                    <div className="coin animate-float-1 w-32 h-32 top-1/4 left-1/4"></div>
                    <div className="coin animate-float-2 w-20 h-20 top-1/2 left-1/3"></div>
                    <div className="coin animate-float-3 w-48 h-48 top-1/3 right-1/4"></div>
                    <div className="coin animate-float-4 w-16 h-16 bottom-1/4 left-1/2"></div>
                    <div className="coin animate-float-5 w-24 h-24 top-3/4 right-1/3"></div>
                    <div className="coin animate-float-6 w-40 h-40 bottom-1/3 left-1/4"></div>
                    <div className="coin animate-float-1 w-28 h-28 bottom-1/2 right-1/2"></div>
                    <div className="coin animate-float-3 w-20 h-20 top-10 left-10"></div>
                    <div className="coin animate-float-5 w-36 h-36 bottom-10 right-10"></div>
                </div>

                {/* Centered Content */}
                <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
                    
                    {/* Glassmorphism Card */}
                    <div className="w-full max-w-md rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-lg border border-white/20">
                        <div className="text-center">
                            <h1 className="text-4xl font-bold text-white text-shadow-custom">
                                Sign In
                            </h1>
                            <p className="py-4 text-gray-200 text-shadow-custom">
                                Use your official registered Google account to continue.
                            </p>
                        </div>

                        {/* Error Alert - Styled with glass effect */}
                        {error && (
                            <div role="alert" className="my-4 rounded-lg border border-red-500/50 bg-red-500/30 p-4 text-white backdrop-blur-md">
                                <div className="flex items-center">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-6 w-6 shrink-0 stroke-current"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <span className="ml-3">{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Button Container */}
                        <div className="mt-6">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/20 p-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 ease-in-out hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    // Tailwind CSS spinner
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                                ) : (
                                    // Google SVG
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
                                            fill="#EB4335"
                                        />
                                    </svg>
                                )}
                                <span className="fill-white">
                                    {isLoading ? "Signing in..." : "Sign in with Google"}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

