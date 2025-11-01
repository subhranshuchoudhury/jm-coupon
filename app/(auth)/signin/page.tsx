"use client";
import pb from "@/lib/pocketbase";
import { useState } from "react";
import { setCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import useProfileStore from "@/stores/profile.store";
import { Phone, MapPin, ShieldCheck } from "lucide-react";

export default function SignInForm() {
    const { setProfile } = useProfileStore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ... (Your handleGoogleSignIn function remains exactly the same) ...
    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await pb.collection("users").authWithOAuth2({
                provider: "google",
            });

            if (response.record) {
                const updates: Record<string, any> = {};

                if (!response.record.emailVisibility) {
                    updates.emailVisibility = true;
                }

                if (!response.record.role) {
                    updates.role = "user";
                }

                if (Object.keys(updates).length > 0) {
                    await pb.collection("users").update(response.record.id, updates);
                }
            }

            if (process.env.NODE_ENV === "development") {
                console.log("Google Sign-In Response:", response);
                console.log("Auth valid:", pb.authStore.isValid);
                console.log("Auth token:", pb.authStore.token);
                console.log("Auth Record", pb.authStore.record);
            }

            const token = response.token;
            const record = response.record;
            if (record) {
                setProfile({
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
                });

                await setCookie("pb_auth", token, {
                    maxAge: 1000 * 60 * 60 * 24 * 365, // 365 days
                });
                await setCookie("role", record.role ?? "user", {
                    maxAge: 1000 * 60 * 60 * 24 * 365, // 365 days
                });

                if (response.token) {
                    if (response.record.role === "admin") {
                        router.replace("/admin");
                    } else {
                        router.replace("/");
                    }
                }
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
            <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gray-100 p-4 font-sans">

                {/* === START: Floating Coins Background === */}
                {/* We replaced 'animate-float-slow' with our new 'coin-float-slow' class, etc. */}
                <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
                    <img
                        src="/icons/coin.png"
                        alt=""
                        className="absolute w-20 h-20 opacity-30  rotate-12 coin-float-slow" // CHANGED
                        style={{ top: '10%', left: '5%', animationDelay: '0s' }}
                    />
                    <img
                        src="/icons/coin.png"
                        alt=""
                        className="absolute w-16 h-16 opacity-20  -rotate-12 coin-float" // CHANGED
                        style={{ top: '20%', left: '80%', animationDelay: '1s' }}
                    />
                    <img
                        src="/icons/coin.png"
                        alt=""
                        className="absolute w-12 h-12 opacity-30 rotate-30 coin-float-fast" // CHANGED
                        style={{ top: '70%', left: '15%', animationDelay: '0.5s' }}
                    />
                    <img
                        src="/icons/coin.png"
                        alt=""
                        className="absolute w-24 h-24 opacity-25  coin-float" // CHANGED
                        style={{ top: '65%', left: '70%', animationDelay: '2s' }}
                    />
                    <img
                        src="/icons/coin.png"
                        alt=""
                        className="absolute w-14 h-14 opacity-20 blur-md -rotate-20 coin-float-slow" // CHANGED
                        style={{ top: '35%', left: '40%', animationDelay: '1.5s' }}
                    />
                </div>
                {/* === END: Floating Coins Background === */}

                <div className="w-full max-w-lg rounded-md bg-transparent shadow-2xl overflow-hidden my-8 relative z-10">

                    {/* ... (Rest of your JSX for the card... logo, button, etc.) ... */}
                    {/* Top Section: Logo & Welcome Message */}
                    <div className="p-8 md:p-12 text-center">
                        {/* Logo Placeholder */}
                        <img
                            src="/icons/jm_logo_tp.png"
                            alt="Jyeshtha Motors Logo"
                            className="mx-auto h-20 w-auto mb-6"
                            // Fallback to hide the broken image icon if the logo isn't found
                            onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = "none";
                                // Optionally, you could show a placeholder text element
                            }}
                        />
                        {/* <h1 className="text-3xl font-bold text-gray-900">
                            Welcome
                        </h1> */}
                        <div className="flex items-center mt-4">
                            <div className="grow border-t border-gray-300"></div>
                            <p className="mx-4 text-xl font-semibold text-gray-700 tracking-wide leading-relaxed">
                                Jyeshtha Motors
                            </p>
                            <div className="grow border-t border-gray-300"></div>
                        </div>
                        <p className="text-sm text-gray-500">
                            Since 2013
                        </p>
                    </div>

                    {/* Action Section: Button & Error Message */}
                    <div className="px-8 md:px-12">
                        {/* Error Alert - Styled for the new sharp theme */}
                        {error && (
                            <div
                                role="alert"
                                className="my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
                            >
                                <div className="flex items-center">
                                    <ShieldCheck className="h-5 w-5 shrink-0" />
                                    <span className="ml-3">{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Button Container */}
                        <div className="mt-2 mb-6">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 p-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 ease-in-out hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
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

                    {/* Footer/Info Section */}
                    <div className="p-8 md:px-12 mt-4 bg-gray-50 border-t border-gray-200">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-center mb-4">
                            About Us
                        </h2>

                        {/* Company Intro */}
                        <p className="text-sm text-gray-700 text-center mb-6">
                            <strong>JYESHTHA MOTORS</strong> is a trusted name in the
                            automobile ancillary industry, serving customers since{" "}
                            <strong>2013</strong>. Based in <strong>Cuttack, Odisha</strong>,
                            we specialize in genuine spare parts for heavy commercial
                            vehicles.
                        </p>

                        {/* Contact Info */}
                        <div className="space-y-3 text-center">
                            <a
                                href="tel:9583967497"
                                className="inline-flex items-center gap-3 text-sm text-gray-800 hover:text-blue-600 transition-colors group"
                            >
                                <Phone className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-blue-600" />
                                <span>
                                    Contact for issues: <strong>9583967497</strong>
                                </span>
                            </a>
                            <br />
                            <a
                                href="https://maps.app.goo.gl/nHcY1nLYpWjkTdBi8"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 text-sm text-gray-800 hover:text-blue-600 transition-colors group"
                            >
                                <MapPin className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-blue-600" />
                                <span>View our Location on Maps</span>
                            </a>
                        </div>
                    </div>

                </div>
            </div>

            {/* === ADD THIS ENTIRE BLOCK === */}
            <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(-8px);
          }
          50% {
            transform: translateY(8px);
          }
        }

        /* We have to re-apply the rotation from the className inside the animation,
          so we use CSS variables to pass it.
          Unfortunately, styled-jsx doesn't support this easily.
          
          A simpler way is to just define the animation and let the
          Tailwind 'rotate-X' class handle the static rotation.
          Let's try that.
        */
        
        .coin-float {
           /* We combine the transform from the keyframe with the rotation from the class */
           animation: float 6s ease-in-out infinite;
        }
        
        .coin-float-slow {
           animation: float 8s ease-in-out infinite;
        }

        .coin-float-fast {
           animation: float 4s ease-in-out infinite;
        }
        
        /* The 'rotate-X' classes from Tailwind will still work alongside
           the 'translateY' from the animation, so this is all you need!
        */
      `}</style>
            {/* === END OF BLOCK TO ADD === */}
        </>
    );
}