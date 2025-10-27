"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reusable Pagination Component
 */
type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
};

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-center pt-2">
            <div className="join">
                <button
                    className="join-item btn btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    <ChevronLeft size={16} /> Prev
                </button>
                {/* Always show current page button */}
                <button className="join-item btn btn-sm btn-active pointer-events-none">
                    {currentPage} / {totalPages}
                </button>
                <button
                    className="join-item btn btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    Next <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

export default Pagination;