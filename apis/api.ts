import { Company, Coupon, PaginatedResult, PocketBaseCompany, PocketBaseCoupon, PocketBaseRedeemRequest, PocketBaseUser, RedeemRequestAdmin, RedeemStatus, User } from "@/app/types";
import pb from "@/lib/pocketbase";
import { ListResult } from "pocketbase";

const PER_PAGE = 10;

export const fetchUsers = async (
    page: number,
    searchTerm?: string,
    searchField?: 'name' | 'id' | 'email' | 'phone'
): Promise<PaginatedResult<User> & { searchTermUsed: string | undefined }> => {

    let filter = '';
    const term = searchTerm?.trim();

    if (term) {
        // PocketBase filter syntax
        if (searchField === 'name' || searchField === 'email' || searchField === 'phone') {
            // Use '~' for partial, case-insensitive matching
            filter = `${searchField} ~ '${term}'`;
        } else if (searchField === 'id') {
            // Use '=' for exact matching, or '~' for partial ID search if desired
            filter = `id = '${term}'`;
        }
        // Note: For 'name' or 'email' consider using a wild card like:
        // filter = `${searchField} ~ '%${term}%'`;
    }

    const resultList: ListResult<PocketBaseUser> = await pb.collection('users').getList(page, PER_PAGE, {
        sort: '-total_points',
        filter: filter || undefined, // Apply filter if it exists
    });

    const users: User[] = resultList.items.map(item => ({
        id: item.id,
        name: item.name || 'N/A',
        email: item.email,
        total_points: item.total_points || 0,
        role: item.role || 'user',
        avatar: item.avatar,
        collectionId: item.collectionId,
        phone: item.phone,
    }));

    return {
        page: resultList.page,
        perPage: resultList.perPage,
        totalPages: resultList.totalPages,
        totalItems: resultList.totalItems,
        items: users,
        searchTermUsed: term, // Return the term used for the query key reset logic
    };
};

export const fetchCoupons = async (page: number, searchQuery?: string): Promise<PaginatedResult<Coupon>> => {
    let filter = '';
    if (searchQuery) {
        filter = `code ~ '${searchQuery}'`;
    }

    // PocketBase response from getList of 'coupons' collection
    const resultList: ListResult<PocketBaseCoupon> = await pb.collection('coupons').getList(page, PER_PAGE, {
        sort: '-created',
        expand: 'company,redeemed_by', // Expand the company relation to get company details
        filter: filter || undefined,
    });

    const coupons: Coupon[] = resultList.items.map(item => {
        // Since your provided schema only has a boolean 'redeemed' field, 
        // we'll use a simplified status instead of a hypothetical 'usesLeft' field.

        return {
            id: item.id,
            code: item.code,
            points: item.points, // Assuming points is a number or can be parsed
            redeemed: item.redeemed,
            mrp: item.mrp,
            companyName: item?.expand?.company?.name || 'N/A',
            company: item.company,
            created: item.created,
            updated: item.updated,
            redeemed_by: item?.expand?.redeemed_by || null,
            timestamp: item.timestamp
            // expiryDate: item.expiryDate?.split(' ')[0] || '', // Removed due to missing field
        };
    });

    return {
        page: resultList.page,
        perPage: resultList.perPage,
        totalPages: resultList.totalPages,
        totalItems: resultList.totalItems,
        items: coupons,
    };
};
export const fetchCompanies = async (page: number): Promise<PaginatedResult<Company>> => {
    const resultList: ListResult<PocketBaseCompany> = await pb.collection('companies').getList(page, PER_PAGE, {
        sort: '-created',
    });

    const company: Company[] = resultList.items.map(item => {

        return {
            id: item.id,
            name: item.name,
            conversion_factor: item.conversion_factor,
        };
    });

    return {
        page: resultList.page,
        perPage: resultList.perPage,
        totalPages: resultList.totalPages,
        totalItems: resultList.totalItems,
        items: company,
    };
};

export const updateUser = async ({ id, data }: { id: string, data: Partial<PocketBaseUser> }) => {
    return await pb.collection('users').update(id, data);
};

export const deleteUser = async (id: string) => {
    return await pb.collection('users').delete(id);
};

export const manualPointGrant = async (data: { userId: string, points: number, code: string }) => {
    // This action typically involves two steps:
    // 1. Create a transaction record (in a 'coupons_transactions' or 'points_log' collection)
    // 2. Update the user's total_points (either manually or via a PocketBase hook on transaction create)

    // For a safe example, we'll create the log record first.
    const transactionRecord = await pb.collection('coupons_transactions').create({
        user: data.userId,
        points: data.points,
        message: `Admin Issued: ${data.code}`,
        type: 'admin_grant',
    });

    // You would then update the user's points here, or rely on a PocketBase server-side hook
    // await pb.collection('users').update(data.userId, {
    //     'total_points+': data.points // Example of incrementing a number field
    // });

    return transactionRecord;
};

export const deleteCoupon = async (id: string) => {
    return await pb.collection('coupons').delete(id);
};
export const deleteCompany = async (id: string) => {
    return await pb.collection('companies').delete(id);
};

export const createOrUpdateCompany = async ({ id, data }: { id: string | 'new', data: Partial<PocketBaseCompany> }) => {
    const payload: Partial<PocketBaseCompany> = {
        name: data.name?.toLowerCase(),
        conversion_factor: data.conversion_factor,
    };

    if (id === 'new') {
        return await pb.collection('companies').create(payload);
    } else {
        return await pb.collection('companies').update(id, payload);
    }
};
export const createOrUpdateCoupon = async ({ id, data }: { id: string | 'new', data: Partial<PocketBaseCoupon> }) => {
    const payload: Partial<PocketBaseCoupon> = {
        code: data.code,
        points: data.points,
        mrp: data.mrp,
        company: data.company,
    };

    if (id === 'new') {
        return await pb.collection('coupons').create(payload);
    } else {
        return await pb.collection('coupons').update(id, payload);
    }
};

export const fetchRedeemRequests = async (page: number): Promise<PaginatedResult<RedeemRequestAdmin>> => {
    const resultList: ListResult<PocketBaseRedeemRequest> = await pb.collection('redeem_requests').getList(page, PER_PAGE, {
        expand: 'user', // Request to expand the user relation
        sort: '-created',
    });

    const requests: RedeemRequestAdmin[] = resultList.items.map(item => {
        // Fallback for user name: 1. Expanded user name 2. full_name field 3. 'Unknown User'
        const userName = item.expand?.user?.name || item.full_name || 'Unknown User';
        // Coerce points to a number
        const pointsValue = typeof item.points === 'string' ? parseInt(item.points, 10) || 0 : item.points;

        return {
            id: item.id,
            userId: item.user,
            userName: userName,
            rewardTitle: item.title,
            points: pointsValue,
            status: item.status as RedeemStatus,
            message: item.message,
            date: item.created,
            upi_id: item.upi_id,
            full_name: item.full_name,
        };
    });

    return {
        page: resultList.page,
        perPage: resultList.perPage,
        totalPages: resultList.totalPages,
        totalItems: resultList.totalItems,
        items: requests,
    };
};

export const updateRedeemRequest = async ({ id, data }: { id: string, data: Partial<PocketBaseRedeemRequest> }) => {
    // Ensure status is normalized to lowercase for PocketBase enum matching
    const normalizedData = {
        ...data,
        status: data.status?.toLowerCase(),
    };
    return await pb.collection('redeem_requests').update(id, normalizedData);
};
