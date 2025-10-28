"use client"; // Assuming Next.js App Router

import { useEffect, useState } from 'react';
import {
  Sparkles, Ticket, X, LogOut,
  User, Phone, ShieldUser
} from 'lucide-react';
// --- New Import for QR Scanner ---
import pb from '@/lib/pocketbase';
import { deleteCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import useProfileStore from '@/stores/profile.store';
// --- MODIFIED IMPORT ---
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import RedeemModalContent from './components/RedeemModalContent';
import { RedeemRequest, Reward } from './types';
import HomePage from './components/HomePage';

// --- MOCK DATA (Only for rewards, as no API was provided for it) ---
const mockRewards = [
  { id: 'r1', title: '₹50 Voucher', points: 5000, icon: Ticket },
  { id: 'r3', title: '₹100 Voucher', points: 10000, icon: Ticket },
];

// --- TYPE DEFINITIONS ---
// This type definition is based on the transformation we will do
type Transaction = {
  id: string;
  type: 'earn' | 'redeem';
  title: string;
  points: number;
  date: string;
};
// --- New Type for Redeem Request ---

// --- API FETCHING FUNCTIONS ---

/**
 * Formats an ISO date string to a "Month Day" format
 * e.g., "2023-10-25T10:00:00.123Z" -> "Oct 25"
 */
const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'short',     // "Nov"
    day: '2-digit',     // "24"
    hour: '2-digit',    // "10"
    minute: '2-digit',  // "56"
    second: '2-digit',  // "09"
    hour12: true        // "PM"
  });
};

/**
 * Fetches all transactions (earn/redeem) for a user
 */
const fetchTransactions = async (userId: string): Promise<Transaction[]> => {
  if (!userId) return [];
  const resultList = await pb
    .collection('coupons_transactions')
    .getList(1, 5, {
      filter: `user = "${userId}"`,
      sort: '-created', // Show most recent first
    });

  // Transform API data to match the component's expected Transaction type
  const transactions: Transaction[] = resultList.items.map((item: any) => ({
    id: item.id,
    points: item.points, // Assumes points are positive for earn, negative for redeem
    type: item.points >= 0 ? 'earn' : 'redeem',
    title: item.message,
    date: formatDate(item.created),
  }));

  return transactions;
};

/**
 * Fetches all redeem requests for a user
 * (Assumes a collection named 'redeem_requests')
 */
const fetchRedeemRequests = async (
  userId: string
): Promise<RedeemRequest[]> => {
  if (!userId) return [];
  // --- ASSUMING collection name is 'redeem_requests' ---
  const resultList = await pb
    .collection('redeem_requests')
    .getList(1, 5, {
      filter: `user = "${userId}"`,
      sort: '-created', // Show most recent first
    });

  // Transform API data to match the component's expected RedeemRequest type
  const requests: RedeemRequest[] = resultList.items.map((item: any) => ({
    id: item.id,
    title: item.title,
    points: item.points,
    date: formatDate(item.created),
    status: item.status, // Assumes API fields match (Pending, Accepted, Rejected)
    message: item.message,
  }));

  return requests;
};

// --- MAIN APP COMPONENT ---

/**
 * Main App component that renders the home page and global modals
 */
function App() {
  const router = useRouter();
  const queryClient = useQueryClient(); // Get query client

  const { profile, updateProfile } = useProfileStore();

  // --- REMOVED `totalPoints` state, will use `profile.total_points` directly ---
  const [alertMessage, setAlertMessage] = useState('');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  // --- New state for redemption form ---
  const [upiId, setUpiId] = useState('');
  const [fullName, setFullName] = useState('');

  // --- NEW: State for phone number prompt ---
  const [phoneInput, setPhoneInput] = useState('');


  // Populate UPI ID and Full Name from profile on load
  useEffect(() => {
    if (profile && profile.upi_id) {
      setUpiId(profile.upi_id);
    }
    if (profile && profile.full_name) {
      setFullName(profile.full_name);
    }
    // NEW: Populate phone input if available
    if (profile && profile.phone) {
      setPhoneInput(profile.phone);
    }
  }, [profile]);


  // --- NEW: Effect to check for missing phone and open modal ---
  useEffect(() => {
    // Check if the user is logged in (profile exists) AND phone is falsy (null, '', 0, etc.)
    if (profile && !profile.phone) {
      // The modal should only open automatically once.
      // We use a safe check to ensure the DOM element exists before calling showModal
      const phoneModal = document.getElementById('phone_prompt_modal') as HTMLDialogElement;
      if (phoneModal) {
        phoneModal.showModal();
      }
    }
  }, [profile]); // Rerun whenever the profile object changes

  // --- REMOVED `redeemRequests` state ---

  // Helper function to show the global alert modal
  const showAlert = (message: string) => {
    setAlertMessage(message);
    (document.getElementById('alert_modal') as HTMLDialogElement)?.showModal();
  };

  // --- NEW: Fetch Transactions (My Activity / My History) ---
  const { data: allTransactions = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['transactions', profile?.uid],
    queryFn: () => fetchTransactions(profile!.uid),
    enabled: !!profile?.uid, // Only run if profile.uid exists
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // --- NEW: Fetch Redeem Requests ---
  const { data: redeemRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['redeemRequests', profile?.uid],
    queryFn: () => fetchRedeemRequests(profile!.uid),
    enabled: !!profile?.uid, // Only run if profile.uid exists
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // --- NEW: Mutation for creating a Redeem Request (existing logic) ---
  const createRedeemRequestApi = async (data: {
    reward: Reward;
    upi: string;
    name: string;
  }) => {
    const apiData = {
      title: data.reward.title,
      points: data.reward.points, // Store the positive point cost
      upi_id: data.upi,
      full_name: data.name || '',
    };

    // Assuming the user is authenticated, the request should handle the user context
    const record = await pb.send("/api/v1/redeem", {
      method: "POST",
      body: JSON.stringify(apiData),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return record;
  };

  const { mutate: createRedeemRequest, isPending: isRedeeming } = useMutation({
    mutationFn: createRedeemRequestApi,
    onSuccess: () => {
      showAlert(`Successfully submitted request for "${selectedReward!.title}"!`);

      // Optimistic update of profile points and form fields in store
      updateProfile({
        total_points: profile!.total_points - selectedReward!.points,
        full_name: fullName,
        upi_id: upiId,
      })

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['redeemRequests', profile!.uid] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', profile!.uid] }); // To update points
      queryClient.invalidateQueries({ queryKey: ['transactions', profile!.uid] });

      // Close modals
      (
        document.getElementById('redeem_confirm_modal') as HTMLDialogElement
      )?.close();
      (
        document.getElementById('redeem_page_modal') as HTMLDialogElement
      )?.close();

      // Clear state
      setSelectedReward(null);
    },
    onError: (error: any) => {
      const errorMessage =
        error?.data?.message || error.message || 'An unknown error occurred.';
      showAlert(`Redemption failed: ${errorMessage}`);
    },
  }
  );

  // --- NEW: Mutation for updating the user's phone number ---
  const updatePhoneApi = async (newPhone: string) => {
    if (!profile?.uid) throw new Error("User ID is missing.");
    const updateData = {
      "phone": newPhone,
    };
    // Assuming the authenticated user can update their own record in 'users' collection
    const record = await pb.collection('users').update(profile.uid, updateData);
    return record;
  };

  const { mutate: updatePhoneMutation, isPending: isUpdatingPhone } = useMutation({
    mutationFn: updatePhoneApi,
    onSuccess: (data: any) => {
      // Update the local store with the new phone number
      updateProfile({
        phone: data.phone, // Assuming API response has the new phone field
      });

      // Close the modal
      (document.getElementById('phone_prompt_modal') as HTMLDialogElement)?.close();

      showAlert('Phone number successfully updated!');

      // Clear input state
      // setPhoneInput(''); // Keep the updated value in state
    },
    onError: (error: any) => {
      const errorMessage =
        error?.data?.message || error.message || 'An unknown error occurred while updating.';
      showAlert(`Update failed: ${errorMessage}`);
    },
  });

  // --- Handler for phone number update submission ---
  const handlePhoneUpdate = () => {
    if (isUpdatingPhone) return;

    // Validation: Check for 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneInput.trim())) {
      showAlert('Please enter a valid 10-digit phone number.');
      return;
    }

    // Call the mutation
    updatePhoneMutation(phoneInput.trim());
  };

  // --- Redemption Logic ---

  // 1. When a reward is clicked in the modal
  const handleRedeemClick = (reward: Reward) => {
    // --- NEW: Pre-redemption check for phone number ---
    if (!profile?.phone) {
      showAlert('Please complete your profile by providing your phone number before redeeming a reward.');
      // Open the phone prompt modal
      const phoneModal = document.getElementById('phone_prompt_modal') as HTMLDialogElement;
      if (phoneModal) {
        // Reset the input state to the current profile value (if any) or empty string
        setPhoneInput(profile?.phone || '');
        phoneModal.showModal();
      }
      return; // Stop redemption flow
    }
    // --- End NEW Check ---

    setSelectedReward(reward);
    (
      document.getElementById('redeem_confirm_modal') as HTMLDialogElement
    )?.showModal();
  };

  // 2. When user confirms in the confirmation modal
  const handleRedemptionConfirm = () => {
    if (!selectedReward || isRedeeming) return;

    // --- Validation ---
    if (!upiId.trim()) {
      showAlert('UPI ID is mandatory. Please enter a valid UPI ID.');
      return; // Stop execution, keep modal open
    }
    // --- End Validation ---

    // --- Use profile.total_points from the store ---
    if (profile!.total_points >= selectedReward.points) {
      // Call the mutation
      createRedeemRequest({
        reward: selectedReward,
        upi: upiId,
        name: fullName,
      });
    } else {
      showAlert('Not enough points to redeem this reward.');
      // Don't close modal, let user see the error
    }
  };

  // 3. When user cancels confirmation
  const handleRedemptionCancel = () => {
    setSelectedReward(null);
  };

  // --- Modal Opening ---
  const openRedeemModal = () => {
    (
      document.getElementById('redeem_page_modal') as HTMLDialogElement
    )?.showModal();
  };

  // --- Derived State for Tabs ---

  return (
    <div className="flex flex-col min-h-screen bg-base-200">
      <HomePage
        totalPoints={profile?.total_points || 0}
        transactions={allTransactions} // Pass full list
        redeemRequests={redeemRequests} // Pass fetched list
        isLoadingHistory={isLoadingHistory} // Pass loading state
        isLoadingRequests={isLoadingRequests} // Pass loading state
        onRedeemClick={openRedeemModal}
        showAlert={showAlert}
      />

      {/* --- GLOBAL MODALS --- */}

      {/* Notification Modal (Unchanged) */}
      <dialog id="notification_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Notifications</h3>
          <div className="py-4 space-y-4">
            <div className="flex items-start p-3 bg-base-200 rounded-lg gap-3">
              <Sparkles size={20} className="text-info mt-1 shrink-0" />
              <div>
                <p className="font-semibold">Welcome!</p>
                <p className="text-sm text-base-content/80">
                  Thanks for joining our rewards program. Start earning points today!
                </p>
              </div>
            </div>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Global Alert Modal (Unchanged) */}
      <dialog id="alert_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Alert</h3>
          <p className="py-4">{alertMessage}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-primary">OK</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Profile Modal (Unchanged) */}
      <dialog id="profile_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Profile</h3>

          {/* Profile content */}
          <div className="flex flex-col items-center py-6">
            <div className="avatar placeholder mb-4">
              <div className="bg-neutral text-neutral-content rounded-full w-24">
                {/* <User size={48} /> */}
                {
                  profile?.avatar ? (<img alt='profile' width={48} height={48} src={`${pb.baseURL}/api/files/${profile.avatarCollectionId}/${profile.uid}/${profile.avatar}`} />) : (<User size={48} />)
                }

              </div>
            </div>
            <p className="text-xl font-semibold">{profile?.name}</p>
            <p className="text-base-content/70">{profile?.email}</p>
            {profile?.phone && <p className="text-base-content/70 flex items-center gap-1 mt-1"><Phone size={14} />{profile.phone}</p>}
          </div>

          {/* Action Buttons */}
          {
            profile?.role === 'admin' && (
              <div className="space-y-2 mb-2">
                <button
                  className="btn btn-info btn-outline w-full"
                  onClick={() => {
                    router.push("/admin");
                  }}
                >
                  <ShieldUser size={18} className="mr-2" />
                  Admin Dashboard
                </button>
              </div>
            )
          }
          <div className="space-y-2">
            <button
              className="btn btn-outline btn-error w-full"
              onClick={() => {
                pb.authStore.clear();
                deleteCookie('pb_auth');
                deleteCookie('role');
                router.refresh();
              }}
            >
              <LogOut size={18} className="mr-2" />
              Logout
            </button>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* --- NEW: Phone Number Prompt Modal --- */}
      <dialog id="phone_prompt_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-warning flex items-center gap-2">
            <Phone size={24} />
            Important: Phone Number Required
          </h3>
          <p className="py-4">
            To proceed with redemptions and ensure delivery of your rewards, please provide your **10-digit mobile number**.
          </p>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Mobile Number (10 digits)</span>
              <span className="label-text-alt text-error">* Required</span>
            </label>
            <input
              type="tel" // Use tel for mobile numbers
              placeholder="e.g., 9876543210"
              className="input input-bordered w-full"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))} // Allow only digits and limit to 10
              disabled={isUpdatingPhone}
              maxLength={10}
            />
          </div>

          <div className="modal-action mt-4">
            {/* The primary button calls the handler */}
            <button
              className="btn btn-primary"
              onClick={handlePhoneUpdate}
              disabled={isUpdatingPhone}
            >
              {isUpdatingPhone ? (
                <span className="loading loading-spinner"></span>
              ) : (
                'Save Phone Number'
              )}
            </button>
            {/* Conditional Close button (only show if profile.phone exists, otherwise user MUST enter it) */}
            {profile?.phone && (
              <form method="dialog">
                <button className="btn btn-ghost" disabled={isUpdatingPhone}>
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
        {/* Backdrop only closes if profile.phone exists */}
        <form method="dialog" className="modal-backdrop">
          {profile?.phone && <button>close</button>}
        </form>
      </dialog>

      {/* Redeem Page Modal (Unchanged) */}
      <dialog id="redeem_page_modal" className="modal">
        <div className="modal-box max-w-md w-full p-0">
          {/* Modal Header with Close Button */}
          <div className="flex justify-between items-center p-4 border-b border-base-300">
            <h3 className="font-bold text-lg">Redeem Points</h3>
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost">
                <X size={20} />
              </button>
            </form>
          </div>

          {/* Modal Content */}
          <RedeemModalContent
            rewards={mockRewards}
            onRedeemClick={handleRedeemClick}
          />
        </div>

        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Redeem Confirmation Modal (Unchanged form fields and logic) */}
      <dialog id="redeem_confirm_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Confirm Redemption</h3>
          {selectedReward && (
            <p className="pt-4 pb-2">
              You are redeeming{' '}
              <span className="font-bold text-primary">
                "{selectedReward.title}"
              </span>{' '}
              for{' '}
              <span className="font-bold">
                {selectedReward.points.toLocaleString()} points
              </span>
              .
              <br />
              Please provide your UPI ID to receive the voucher/cashback.
            </p>
          )}

          {/* --- NEW FORM --- */}
          <div className="space-y-2 py-2">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">UPI ID</span>
                <span className="label-text-alt text-error">* Required</span>
              </label>
              <input
                type="text"
                placeholder="your-name@upi"
                className="input input-bordered w-full"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                disabled={isRedeeming} // Disable on loading
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Full Name</span>
                <span className="label-text-alt">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Jane Doe"
                className="input input-bordered w-full"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isRedeeming} // Disable on loading
              />
            </div>
          </div>
          {/* --- END NEW FORM --- */}

          <div className="modal-action">
            {/* This form is ONLY for the cancel button */}
            <form method="dialog">
              <button
                className="btn btn-ghost mr-2"
                onClick={handleRedemptionCancel}
                disabled={isRedeeming} // Disable on loading
              >
                Cancel
              </button>
            </form>
            {/* This button is outside the form and just calls the handler */}
            <button
              className="btn btn-primary"
              onClick={handleRedemptionConfirm}
              disabled={isRedeeming} // Disable on loading
            >
              {isRedeeming ? (
                <span className="loading loading-spinner"></span>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleRedemptionCancel}>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default App; // Renamed default export