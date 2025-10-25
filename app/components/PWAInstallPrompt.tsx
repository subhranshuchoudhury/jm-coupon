import { useEffect, useState } from "react";

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the default mini-infobar prompt
            e.preventDefault();
            // Type cast the event to the correct custom type
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);
            setShowInstallButton(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
            console.log("PWA installed");
        } else {
            console.log("PWA dismissed");
        }
        setDeferredPrompt(null);
        setShowInstallButton(false);
    };

    if (!showInstallButton) return null;

    return (
        <div
            role="alert"
            className="alert shadow-lg fixed bottom-4 right-4 z-50 w-auto"
        // We use the `alert` component from daisyUI.
        // It replaces: `bg-white p-3 rounded-xl flex items-center gap-2`
        // `alert` handles the background (using `base-100`), padding, border-radius, and layout.
        // `shadow-lg` is a standard Tailwind class also used by daisyUI.
        // `fixed bottom-4 right-4 z-50` are kept for positioning.
        // `w-auto` makes the alert only as wide as its content.
        >
            <span>Install our app?</span> {/* Using <span> is common inside alerts */}

            <button
                onClick={handleInstallClick}
                className="btn btn-sm btn-primary"
            // We use the `btn` component from daisyUI.
            // It replaces: `bg-black text-white px-3 py-1 rounded-lg hover:bg-gray-800 transition-colors`
            // `btn-sm` provides a small size, similar to the original padding.
            // `btn-primary` uses your theme's primary color, which is great for a key action.
            >
                Install
            </button>
        </div>
    );
}

/**
 * Type for the "beforeinstallprompt" event.
 * (Not included in standard DOM types)
 */
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    prompt: () => Promise<void>;
}