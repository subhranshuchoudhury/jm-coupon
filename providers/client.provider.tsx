"use client";

import { PropsWithChildren } from "react";
import ReactQueryProvider from "./react-query.provider";
import PWAInstallPrompt from "@/app/components/PWAInstallPrompt";

type ClientProviderProps = PropsWithChildren

export const ClientProvider = ({ children }: ClientProviderProps) => {

    return (
        <ReactQueryProvider>
            {children}
            <PWAInstallPrompt />
        </ReactQueryProvider>
    )
}