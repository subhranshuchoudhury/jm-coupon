'use client';

import { useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function ReactQueryProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Initialize QueryClient in a state to ensure it's only created client-side
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 60 * 1, // 1 minutes
                    },
                },
            })
    );

    // Create persister for localStorage
    const persister = createAsyncStoragePersister({
        storage: typeof window !== 'undefined' ? window.localStorage : null,
        key: 'react-query-cache',
    });

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: 1000 * 60 * 1, // Persist cache for 1 Minute
            }
            }
        >
            {children}
            < ReactQueryDevtools initialIsOpen />
        </PersistQueryClientProvider>
    );
}