"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState, FormEvent } from "react";
import Pagination from "../../Pagination"; // Assuming this path is correct
import { Company } from "@/app/types";
import { createOrUpdateCompany, deleteCompany, fetchCompanies } from "@/apis/api";



// This is the data payload for creating/updating
export type CompanyPayload = {
    name: string;
    conversion_factor: number;
};

// --- END DUMMY API ---

// Helper function to show/close the modal
const showModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.showModal();
const closeModal = (id: string) => (document.getElementById(id) as HTMLDialogElement)?.close();

export default function CompanyManagementView() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null); // State for delete modal

    // Form state for the modal
    const [nameInput, setNameInput] = useState<string>('');
    const [conversionFactorInput, setConversionFactorInput] = useState<number | string>('');

    // Fetch companies data
    const { data, isLoading, isError } = useQuery({
        queryKey: ['companies', currentPage],
        queryFn: () => fetchCompanies(currentPage),
        refetchInterval: 60000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    /** Resets all modal form state and mutation status */
    const resetModalState = () => {
        setSelectedCompany(null);
        setNameInput('');
        setConversionFactorInput('');
        companyMutate.reset();
    };

    // Mutation for creating/updating company
    const companyMutate = useMutation({
        mutationFn: createOrUpdateCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            closeModal('company_edit_modal');
            resetModalState();
        },
    });

    // Mutation for deleting company
    const companyDeleteMutation = useMutation({
        mutationFn: deleteCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        },
    });

    /** Opens the modal and pre-fills it with company data */
    const handleOpenModal = (company: Company) => {
        companyMutate.reset();
        setSelectedCompany(company);
        setNameInput(company.name);
        setConversionFactorInput(company.conversion_factor || '');
        showModal('company_edit_modal');
    }

    /** Handler for the "Edit" button click */
    const handleEditClick = (company: Company) => {
        handleOpenModal(company);
    };

    /** Handler for the "Delete" button click */
    const handleDeleteClick = (company: Company) => {
        setCompanyToDelete(company);
        (document.getElementById('delete_confirmation_modal_company') as HTMLDialogElement)?.showModal();
    };

    const confirmDelete = () => {
        if (companyToDelete) {
            companyDeleteMutation.mutate(companyToDelete.id);
            setCompanyToDelete(null);
            (document.getElementById('delete_confirmation_modal_company') as HTMLDialogElement)?.close();
        }
    };

    /** Handler for the "Create New" button click */
    const handleCreateNew = () => {
        const newCompany: Company = {
            id: 'new',
            name: '',
            conversion_factor: 0,
        };
        handleOpenModal(newCompany);
        // Ensure form is blank for a new entry
        setNameInput('');
        setConversionFactorInput('');
    }

    /** Handler for the modal's form submission */
    const handleModalSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCompany) return;

        const conversionNum = parseFloat(conversionFactorInput.toString()) || 0;

        // Basic validation
        if (!nameInput.trim()) {
            // In a real app, show a validation error
            return;
        }

        const payload: CompanyPayload = {
            name: nameInput.trim(),
            conversion_factor: conversionNum,
        };

        companyMutate.mutate({ id: selectedCompany.id, data: payload });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h1 className="text-3xl font-bold hidden lg:block">Company Management 🏢</h1>
                <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-primary gap-2" onClick={() => handleCreateNew()}>
                        <Plus size={18} /> Create New Company
                    </button>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        {isLoading && !data ? (
                            <div className="flex justify-center items-center h-64">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : isError || !data ? (
                            <div className="text-error text-center p-8">Error loading companies. Please try again.</div>
                        ) : (
                            <table className="table w-full">
                                <thead>
                                    <tr className="border-b border-base-content/10">
                                        <th>Name</th>
                                        <th className="text-right">Conversion Factor</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map(company => (
                                        <tr key={company.id} className="hover">
                                            <td><span className="font-semibold">{company.name}</span></td>
                                            <td className="font-mono text-right">{company.conversion_factor}%</td>
                                            <td>
                                                <div className="join">
                                                    <button
                                                        className="btn btn-sm btn-ghost join-item tooltip tooltip-top"
                                                        data-tip="Edit Company"
                                                        onClick={() => handleEditClick(company)}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-ghost text-error join-item tooltip tooltip-top"
                                                        data-tip="Delete Company"
                                                        onClick={() => handleDeleteClick(company)}
                                                        disabled={companyDeleteMutation.isPending}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {data && (
                        <div className="p-4 border-t border-base-content/10">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={data.totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* --- Company Edit/Create Modal --- */}
            <dialog id="company_edit_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">
                        {selectedCompany?.id === 'new' ? 'Create New Company' : `Edit Company: ${selectedCompany?.name}`}
                    </h3>

                    {/* Mutation Feedback Area */}
                    {(companyMutate.isPending || companyMutate.isSuccess || companyMutate.isError) && (
                        <div className={`alert ${companyMutate.isSuccess ? 'alert-success' : companyMutate.isError ? 'alert-error' : 'alert-info'} my-2`}>
                            {companyMutate.isSuccess
                                ? 'Company saved successfully! Closing...'
                                : companyMutate.isError
                                    ? `Error: ${(companyMutate.error as Error).message}`
                                    : 'Saving changes...'
                            }
                        </div>
                    )}

                    <form onSubmit={handleModalSubmit} className="space-y-4 pt-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Company Name</span></label>
                            <input
                                type="text"
                                name="name"
                                value={nameInput}
                                className="input input-bordered w-full lowercase"
                                required
                                onChange={(e) => setNameInput(e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Conversion Factor (%)</span></label>
                            <input
                                type="number"
                                name="conversion_factor"
                                value={conversionFactorInput}
                                className="input input-bordered w-full"
                                required
                                min="0"
                                step="0.01"
                                placeholder="e.g., 10"
                                onChange={(e) => setConversionFactorInput(e.target.value)}
                            />
                            <label className="label">
                                <span className="label-text-alt">e.g., 10 means 10 points per ₹100 of MRP</span>
                            </label>
                        </div>

                        <div className="modal-action">
                            <button type="button" className="btn btn-ghost" onClick={() => {
                                closeModal('company_edit_modal');
                                resetModalState();
                            }}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" type="submit" disabled={companyMutate.isPending}>
                                {companyMutate.isPending ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </form>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={resetModalState}>close</button>
                </form>
            </dialog>

            {/* Delete Confirmation Modal */}
            <dialog id="delete_confirmation_modal_company" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg text-error">Confirm Deletion</h3>
                    <p className="py-4">
                        Are you absolutely sure you want to delete the company **{companyToDelete?.name}**?
                        This action cannot be undone.
                    </p>
                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => (document.getElementById('delete_confirmation_modal_company') as HTMLDialogElement)?.close()}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-error"
                            onClick={confirmDelete}
                            disabled={companyDeleteMutation.isPending}
                        >
                            {companyDeleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}