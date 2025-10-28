import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { StateCreator, StoreMutatorIdentifier } from 'zustand';

// Define the Profile interface
interface Profile {
    username: string;
    uid: string;
    token: string;
    phone: string;
    email: string;
    name: string;
    avatar: string;
    avatarCollectionId: string;
    total_points: number;
    upi_id?: string;
    full_name?: string;
    role: string;
    created: string;
    updated: string;
}

// Define the store's state and methods
interface ProfileState {
    profile: Profile | null;
    setProfile: (profileData: Partial<Profile>) => void;
    updateProfile: (updates: Partial<Profile>) => void;
    removeProfile: () => void;
}

// Define persist options type
type ProfilePersist = <
    T extends ProfileState,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
    config: StateCreator<T, Mps, Mcs>,
    options: PersistOptions<T>
) => StateCreator<T, Mps, Mcs>;

const useProfileStore = create<ProfileState>(
    (persist as ProfilePersist)(
        (set) => ({
            profile: null,
            setProfile: (profileData) =>
                set({
                    profile: {
                        username: profileData.username || '',
                        uid: profileData.uid || '',
                        token: profileData.token || '',
                        phone: profileData.phone || '',
                        email: profileData.email || '',
                        name: profileData.name || '',
                        avatar: profileData.avatar || '',
                        avatarCollectionId: profileData.avatarCollectionId || '',
                        total_points: profileData.total_points || 0,
                        upi_id: profileData.upi_id || '',
                        full_name: profileData.full_name || '',
                        role: profileData.role || '',
                        created: profileData.created || new Date().toISOString(),
                        updated: new Date().toISOString(),
                    },
                }),
            updateProfile: (updates) =>
                set((state: ProfileState) => ({
                    profile: state.profile
                        ? {
                            ...state.profile,
                            ...updates,
                            updated: new Date().toISOString(),
                        }
                        : null,
                })),
            removeProfile: () => set({ profile: null }),
        }),
        {
            name: 'profile-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export default useProfileStore;