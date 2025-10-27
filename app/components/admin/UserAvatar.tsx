"use client";
import { User } from "@/app/types";
import pb from "@/lib/pocketbase";

export default function UserAvatar({ user, size }: { user: User, size: number }) {
    if (user.avatar && user.avatarCollectionId) {
        // Construct the full avatar URL
        const avatarUrl = `${pb.baseURL}api/files/${user.avatarCollectionId}/${user.id}/${user.avatar}`;
        return (
            <div className="avatar">
                <div className="mask mask-squircle w-12 h-12">
                    <img src={avatarUrl} alt={`${user.name}'s avatar`} width={size} height={size} />
                </div>
            </div>
        );
    }
    // Fallback: simple text-based avatar
    const initial = user.name.substring(0, 2).toUpperCase();
    return (
        <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-12 h-12">
                <span>{initial}</span>
            </div>
        </div>
    );
}