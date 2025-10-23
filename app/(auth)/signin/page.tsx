"use client";
import pb from "@/lib/pocketbase";
import { useState } from "react";
import { setCookie } from 'cookies-next';
import { useRouter } from "next/navigation";
import useProfileStore from "@/stores/profile.store";

export default function SignInForm() {
    const { setProfile } = useProfileStore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Trigger PocketBase Google OAuth2 authentication
            //   await pb.collection("users").authWithOAuth2({
            //     provider: "google",
            //   });

            await pb.collection('users').authWithPassword(
                'subhransuchoudhury00@gmail.com',
                '1234567890',
            );

            // Log auth data for debugging
            console.log("Auth valid:", pb.authStore.isValid);
            console.log("Auth token:", pb.authStore.token);
            console.log("Auth Record", pb.authStore.record);

            // Export auth store to cookie
            const cookieString = pb.authStore.token;
            const record = pb.authStore.record;
            if (record) {
                setProfile({
                    uid: record.id,
                    email: record.email,
                    avatar: record.avatar,
                    updated: record.updated,
                    name: record.name,
                    token: pb.authStore.token,
                    username: record.id,
                    mobile: record.mobile,
                    role: record.role,
                    total_points: record.total_points || 0,
                });

                // Set the cookie using cookies-next
                await setCookie("pb_auth", cookieString, {
                    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
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
        // Use hero for a centered, full-height layout
        <div className="hero min-h-screen bg-base-200">
            <div className="hero-content flex-col w-full max-w-md px-4">
                {/* Header Text */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-base-content">
                        Sign In
                    </h1>
                    <p className="py-4 text-base-content/70">
                        Use your official registered Google account to continue.
                    </p>
                </div>

                {/* Card for the form */}
                <div className="card w-full shadow-2xl bg-base-100">
                    <div className="card-body">

                        {/* Error Alert */}
                        {error && (
                            <div role="alert" className="alert alert-error mb-4">
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
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Button Container */}
                        <div className="form-control mt-2 text-center">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                // Use btn-neutral or btn-primary based on your theme's preference
                                className="btn btn-neutral"
                            >
                                {isLoading ? (
                                    // DaisyUI spinner
                                    <span className="loading loading-spinner"></span>
                                ) : (
                                    // Google SVG
                                    <svg
                                        width="20"
                                        height="20"
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
                                {isLoading ? "Signing in..." : "Sign in with Google"}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}