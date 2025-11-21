import { LucideProps } from "lucide-react";

export type Reward = {
    id: string;
    title: string;
    points: number;
    icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;

}

export type Transaction = {
    id: string;
    type: string;
    title: string;
    points: number;
    date: string;
}

export type RedeemRequest = {
    id: string | number;
    title: string;
    points: number;
    date: string;
    status: 'approved' | 'rejected' | 'pending';
    message?: string;
};

// --- TYPE DEFINITIONS (UPDATED) ---

// Consistent status enum based on your acceptable statuses
export type RedeemStatus = 'pending' | 'approved' | 'rejected' | string;

export type PocketBaseUser = {
    id: string;
    name: string;
    email: string;
    total_points: number;
    role: 'user' | 'admin' | string;
    avatar?: string;
    created: string;
    updated: string;
    // Add the collectionId for image URL generation
    collectionId: string;
    phone: string;
};

export type User = {
    id: string;
    name: string;
    email: string;
    phone: string;
    total_points: number;
    role: 'user' | 'admin' | string;
    avatar?: string;
    collectionId?: string; // Stored for image generation
};

export type PocketBaseRedeemRequest = {
    id: string;
    user: string; // Relation ID to User
    expand?: {
        user: PocketBaseUser;
    };
    points: number | string; // Updated to match your API response with string for robustness
    upi_id: string;
    title: string;
    message: string;
    status: RedeemStatus;
    full_name: string; // From your API response
    created: string;
    updated: string;
};

export type RedeemRequestAdmin = {
    id: string;
    userId: string;
    userName: string;
    rewardTitle: string;
    points: number;
    status: RedeemStatus;
    message: string;
    date: string;
    upi_id: string;
    full_name: string;
};

export type PocketBaseCoupon = {
    id: string;
    code: string;
    points: number;
    redeemed: boolean; // Keep redeemed as per your API
    // usesLeft?: number | 'unlimited'; // Removed as it's not in your API example
    // expiryDate: string; // Removed as it's not in your API example
    created: string;
    updated: string;
    // Add other fields from your API response:
    collectionId: string;
    collectionName: string;
    redeemed_by?: string;
    companyName?: string;
    company?: string;
    mrp?: number;
    timestamp?: string;
    expand?: any;
};
export type PocketBaseCompany = {
    id: string;
    name: string;
    conversion_factor: number;
    created: string;
    updated: string;
    collectionId: string;
    collectionName: string;
};

export type Coupon = {
    id: string;
    code: string;
    points: number;
    mrp?: number;
    companyName?: string;
    company?: string;
    redeemed: boolean;
    created?: string;
    updated?: string;
    redeemed_by?: User;
    timestamp?: string
};
export type Company = {
    id: string;
    name: string;
    conversion_factor: number;
};

export type PaginatedResult<T> = {
    page: number;
    perPage: number;
    totalPages: number;
    totalItems: number;
    items: T[];
};

export type AdminView = 'dashboard' | 'users' | 'redeem' | 'coupons' | 'scan' | 'companies';

export type PocketBaseTopUser = {
    id: string;
    name: string;
    total_points: number;
    collectionId: string;
    collectionName: string;
};

export type TopUser = {
    id: string;
    name: string;
    total_points: number;
};