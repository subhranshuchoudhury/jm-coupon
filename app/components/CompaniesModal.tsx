"use client";

import pb from "@/lib/pocketbase";
import { useQuery } from "@tanstack/react-query";
import { Company } from "../types"; // Adjust path as needed

// --- API call function ---
const fetchCompanies = async () => {
    // Fetches page 1, up to 30 companies, sorted by name
    const result = await pb.collection('view_companies').getList<Company>(1, 30, {
        sort: 'name',
    });
    return result.items;
};

export default function CompaniesModal() {

    // --- React Query hook to fetch data ---
    const { data: companies, isLoading, isError, error } = useQuery({
        queryKey: ['view_companies'], // Unique key for this query
        queryFn: fetchCompanies,
        staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
    });

    const renderContent = () => {
        // 1. Loading state
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-32">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            );
        }

        // 2. Error state
        if (isError) {
            return (
                <div role="alert" className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2.12V7.88c0-1.12-.6-2.12-1.5-2.62L12 2 4.5 5.25C3.6 5.75 3 6.75 3 7.88v8.24c0 1.12.6 2.12 1.5 2.62L12 22l7.5-3.25c.9-.5 1.5-1.5 1.5-2.62z" /></svg>
                    <span>Error: {error.message}</span>
                </div>
            );
        }

        // 3. No data state
        if (!companies || companies.length === 0) {
            return (
                <div className="flex justify-center items-center h-32 text-base-content/70">
                    <p>No companies found.</p>
                </div>
            );
        }

        // 4. Success state
        return (
            <ul className="divide-y divide-base-200 max-h-60 overflow-y-auto">
                {companies.map((company) => (
                    <li key={company.id} className="py-3 px-1 capitalize font-bold text-lg">
                        {company.name}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <dialog id="companies_modal" className="modal modal-bottom sm:modal-middle">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Companies</h3>

                {/* Render content based on query state */}
                <div className="py-4">
                    {renderContent()}
                </div>

                <div className="modal-action">
                    <form method="dialog">
                        {/* if there is a button in form, it will close the modal */}
                        <button className="btn">Close</button>
                    </form>
                </div>
            </div>
            {/* Click outside to close */}
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    );
}