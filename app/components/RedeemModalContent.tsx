// --- REDEEM MODAL CONTENT COMPONENT ---
"use client";
import useProfileStore from "@/stores/profile.store";
import { Reward } from "../types";

type RedeemModalProps = {
    rewards: Reward[];
    onRedeemClick: (reward: Reward) => void;
};

export default function RedeemModalContent({
    rewards,
    onRedeemClick,
}: RedeemModalProps) {
    const { profile } = useProfileStore();

    const conversionPoint = 1;

    const redeemableValue = (profile?.total_points! / conversionPoint).toFixed(2);

    return (
        <>
            {/* Main Content Area (scrollable) */}
            <main className="grow flex flex-col items-center p-4 overflow-y-auto max-h-[70vh]">
                <div className="w-full">
                    {/* Redeemable Value Card */}
                    <div className="card bg-secondary text-secondary-content shadow-lg mb-6">
                        <div className="card-body items-center text-center p-5">
                            <h2 className="card-title opacity-80">Your Points are worth</h2>
                            <p className="text-4xl font-bold">₹{redeemableValue}</p>
                            {/* <p className="opacity-90 text-sm">
                                {profile?.total_points?.toLocaleString()} Points Available
                            </p> */}
                        </div>
                    </div>

                    {/* Rewards List */}
                    <h3 className="text-lg font-semibold mb-3 text-base-content">
                        Available Rewards
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {rewards.map((reward) => {
                            const canAfford = profile?.total_points! >= reward.points;
                            const Icon = reward.icon;
                            return (
                                <div
                                    key={reward.id}
                                    className="card bg-base-100 shadow-md"
                                >
                                    <div className="card-body flex-row justify-between items-center p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-accent/10 rounded-full">
                                                <Icon size={24} className="text-accent" />
                                            </div>
                                            <div>
                                                <h2 className="card-title text-base-content">
                                                    {reward.title}
                                                </h2>
                                                <p className="text-accent font-semibold">
                                                    {reward.points.toLocaleString()} Points
                                                </p>
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button
                                                className="btn btn-primary"
                                                disabled={!canAfford}
                                                onClick={() => onRedeemClick(reward)}
                                            >
                                                Redeem
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </>
    );
}