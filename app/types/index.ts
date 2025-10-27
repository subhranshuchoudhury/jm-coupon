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
};

export type User = {
    id: string;
    name: string;
    email: string;
    total_points: number;
    role: 'user' | 'admin' | string;
    avatar?: string;
    avatarCollectionId?: string; // Stored for image generation
};

export type PocketBaseRedeemRequest = {
    id: string;
    user: string; // Relation ID to User
    expand?: {
        user: PocketBaseUser;
    };
    points: number | string; // Updated to match your API response with string for robustness
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
};

export type Coupon = {
    id: string;
    code: string;
    points: number;
    usesStatus: 'redeemed' | 'available'; // Simplified logic based on provided API: if 'redeemed', usesStatus is 'redeemed'
    // expiryDate: string; // Removed
};

export type PaginatedResult<T> = {
    page: number;
    perPage: number;
    totalPages: number;
    totalItems: number;
    items: T[];
};

export type AdminView = 'dashboard' | 'users' | 'redeem' | 'coupons' | 'scan';