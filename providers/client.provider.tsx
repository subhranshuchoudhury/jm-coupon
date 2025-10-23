"use client";

import { PropsWithChildren } from "react";
import ReactQueryProvider from "./react-query.provider";

type ClientProviderProps = PropsWithChildren

export const ClientProvider = ({ children }: ClientProviderProps) => {

    return (
        <ReactQueryProvider>
            {children}
        </ReactQueryProvider>
    )
}