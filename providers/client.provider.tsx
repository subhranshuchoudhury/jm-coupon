"use client";

import { PropsWithChildren, useEffect } from "react";
import ReactQueryProvider from "./react-query.provider";
import PWAInstallPrompt from "@/app/components/PWAInstallPrompt";

type ClientProviderProps = PropsWithChildren

export const ClientProvider = ({ children }: ClientProviderProps) => {

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            const registerServiceWorker = async () => {
                try {
                    // Make sure the path '/sw.js' is correct
                    const registration = await navigator.serviceWorker.register('/sw.js');

                    if (registration.installing) {
                        console.log('Service worker installing');
                    } else if (registration.waiting) {
                        console.log('Service worker installed');
                    } else if (registration.active) {
                        console.log('Service worker active');
                    }
                } catch (error) {
                    console.error(`Service worker registration failed: ${error}`);
                }
            };

            // Register after the page has loaded
            window.addEventListener('load', registerServiceWorker);

            // Cleanup
            return () => {
                window.removeEventListener('load', registerServiceWorker);
            };
        }
    }, []);


    return (
        <ReactQueryProvider>
            {children}
            <PWAInstallPrompt />
        </ReactQueryProvider>
    )
}