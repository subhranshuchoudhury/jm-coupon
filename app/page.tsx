"use client"; // Assuming Next.js App Router

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Gift,
  QrCode,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Coffee, Ticket,
  Car,
  Percent,
  X,
  User,
  LogOut,
  // --- New Icons for Status ---
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
// --- New Import for QR Scanner ---
import { Scanner } from '@yudiel/react-qr-scanner';
import pb from '@/lib/pocketbase';
import { deleteCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import useProfileStore from '@/stores/profile.store';

// --- MOCK DATA ---

const mockTransactions = [
  { id: 1, type: 'earn', title: 'Welcome Bonus', points: 100, date: 'Oct 23' },
  { id: 2, type: 'redeem', title: 'Free Coffee', points: -150, date: 'Oct 22' },
  { id: 3, type: 'earn', title: 'Scanned Product', points: 10, date: 'Oct 21' },
  { id: 4, type: 'earn', title: 'Weekly Survey', points: 50, date: 'Oct 20' },
  { id: 5, type: 'redeem', title: '$5 Off Coupon', points: -500, date: 'Oct 19' },
];

const mockRedeemHistory = [
  { id: 2, type: 'redeem', title: 'Free Coffee', points: -150, date: 'Oct 22' },
  { id: 5, type: 'redeem', title: '$5 Off Coupon', points: -500, date: 'Oct 19' },
  { id: 6, type: 'redeem', title: 'Movie Ticket', points: -1000, date: 'Oct 15' },
  { id: 7, type: 'redeem', title: 'Free Car Wash', points: -750, date: 'Oct 10' },
];

// --- New Mock Data for Redeem Requests ---
const mockRedeemRequests: RedeemRequest[] = [
  {
    id: 'req1',
    title: '₹100 Voucher',
    points: 10000,
    date: 'Oct 20',
    status: 'Accepted',
    message: 'Voucher code: JYESHTHA-100',
  },
  {
    id: 'req2',
    title: 'Free Car Wash',
    points: 7500,
    date: 'Oct 18',
    status: 'Rejected',
    message: 'Duplicate request. Please contact support.',
  },
  {
    id: 'req3',
    title: '₹50 Voucher',
    points: 5000,
    date: 'Oct 17',
    status: 'Pending',
    message: 'Your request is being processed.',
  },
];

const mockRewards = [
  { id: 'r1', title: '₹50 Voucher', points: 5000, icon: Ticket },
  { id: 'r2', title: 'Free Car Wash', points: 7500, icon: Car },
  { id: 'r3', title: '₹100 Voucher', points: 10000, icon: Ticket },
  { id: 'r4', title: '20% Off Service', points: 15000, icon: Percent },
];

// --- TYPE DEFINITIONS ---
type Transaction = (typeof mockTransactions)[0];
type Reward = (typeof mockRewards)[0];
// --- New Type for Redeem Request ---
type RedeemRequest = {
  id: string | number;
  title: string;
  points: number;
  date: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  message?: string;
};

// --- MAIN APP COMPONENT ---

/**
 * Main App component that renders the home page and global modals
 */
function App() {

  const router = useRouter();

  const { profile } = useProfileStore();

  const [totalPoints, setTotalPoints] = useState(profile?.total_points || 0);
  const [alertMessage, setAlertMessage] = useState('');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  // --- New state for redemption form ---
  const [upiId, setUpiId] = useState('');
  const [fullName, setFullName] = useState('');

  // --- New state for redeem requests ---
  const [redeemRequests, setRedeemRequests] = useState<RedeemRequest[]>(mockRedeemRequests);

  // Helper function to show the global alert modal
  const showAlert = (message: string) => {
    setAlertMessage(message);
    (document.getElementById('alert_modal') as HTMLDialogElement)?.showModal();
  };

  // --- Redemption Logic ---

  // 1. When a reward is clicked in the modal
  const handleRedeemClick = (reward: Reward) => {
    setSelectedReward(reward);
    (
      document.getElementById('redeem_confirm_modal') as HTMLDialogElement
    )?.showModal();
  };

  // 2. When user confirms in the confirmation modal
  const handleRedemptionConfirm = () => {
    if (!selectedReward) return;

    // --- Validation ---
    if (!upiId.trim()) {
      showAlert('UPI ID is mandatory. Please enter a valid UPI ID.');
      return; // Stop execution, keep modal open
    }
    // --- End Validation ---

    if (totalPoints >= selectedReward.points) {
      setTotalPoints((prevPoints) => prevPoints - selectedReward.points);

      // --- Create a new redeem request ---
      const newRequest: RedeemRequest = {
        id: Date.now(),
        title: selectedReward.title,
        points: selectedReward.points,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        status: 'Pending',
        message: 'Your request is being processed.',
      };
      setRedeemRequests((prevRequests) => [newRequest, ...prevRequests]);
      // --- End new request logic ---

      // Log the data (simulation of sending to backend)
      console.log('Redemption Confirmed:', {
        reward: selectedReward.title,
        points: selectedReward.points,
        upiId: upiId,
        fullName: fullName || 'N/A',
      });

      // --- Manually close modals on success ---
      (
        document.getElementById('redeem_confirm_modal') as HTMLDialogElement
      )?.close();
      (
        document.getElementById('redeem_page_modal') as HTMLDialogElement
      )?.close();

      showAlert(`Successfully redeemed "${selectedReward.title}"!`);

      // Clear state AFTER success
      setSelectedReward(null);
      setUpiId('');
      setFullName('');
    } else {
      showAlert('Not enough points to redeem this reward.');
      // Don't close modal, let user see the error
    }
  };

  // 3. When user cancels confirmation
  const handleRedemptionCancel = () => {
    setSelectedReward(null);
    // --- Clear form state on cancel ---
    setUpiId('');
    setFullName('');
  };

  // --- Modal Opening ---
  const openRedeemModal = () => {
    (
      document.getElementById('redeem_page_modal') as HTMLDialogElement
    )?.showModal();
  };

  return (
    <div className="flex flex-col min-h-screen bg-base-200">
      <HomePage
        totalPoints={totalPoints}
        transactions={mockTransactions}
        redeemHistory={mockRedeemHistory}
        redeemRequests={redeemRequests} // Pass new state
        onRedeemClick={openRedeemModal}
        showAlert={showAlert}
      />

      {/* --- GLOBAL MODALS --- */}

      {/* Notification Modal */}
      <dialog id="notification_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Notifications</h3>
          <div className="py-4 space-y-4">
            <div className="flex items-start p-3 bg-base-200 rounded-lg gap-3">
              <Sparkles size={20} className="text-info mt-1 shrink-0" />
              <div>
                <p className="font-semibold">Welcome Bonus!</p>
                <p className="text-sm text-base-content/80">
                  You've received 100 bonus points for joining.
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-base-200 rounded-lg gap-3">
              <Coffee size={20} className="text-success mt-1 shrink-0" />
              <div>
                <p className="font-semibold">Redemption Successful</p>
                <p className="text-sm text-base-content/80">
                  Your 'Free Coffee' reward has been redeemed.
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-base-200 rounded-lg gap-3">
              <Gift size={20} className="text-accent mt-1 shrink-0" />
              <div>
                <p className="font-semibold">New Reward Available</p>
                <p className="text-sm text-base-content/80">
                  Complete your profile to earn 50 extra points!
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

      {/* Global Alert Modal */}
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

      {/* Profile Modal */}
      <dialog id="profile_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Profile</h3>

          {/* Profile content */}
          <div className="flex flex-col items-center py-6">
            <div className="avatar placeholder mb-4">
              <div className="bg-neutral text-neutral-content rounded-full w-24">
                {/* <User size={48} /> */}
              </div>
            </div>
            <p className="text-xl font-semibold">{profile?.name}</p>
            <p className="text-base-content/70">{profile?.email}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* <button
              className="btn btn-outline w-full"
              onClick={() => showAlert('Refreshing data... (Simulation)')}
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh Data
            </button> */}
            <button
              className="btn btn-outline btn-error w-full"
              onClick={() => {
                pb.authStore.clear();
                deleteCookie('pb_auth');
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

      {/* Redeem Page Modal */}
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

      {/* Redeem Confirmation Modal */}
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
              >
                Cancel
              </button>
            </form>
            {/* This button is outside the form and just calls the handler */}
            <button
              className="btn btn-primary"
              onClick={handleRedemptionConfirm}
            >
              Confirm
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

// --- HOME PAGE COMPONENT ---

type HomePageProps = {
  totalPoints: number;
  transactions: Transaction[];
  redeemHistory: Transaction[];
  redeemRequests: RedeemRequest[]; // Added prop
  onRedeemClick: () => void;
  showAlert: (message: string) => void;
};

function HomePage({
  transactions,
  redeemHistory,
  redeemRequests, // Destructure prop
  onRedeemClick,
  showAlert,
}: HomePageProps) {

  const { profile, updateProfile } = useProfileStore();

  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  // --- New state for custom scanner modal ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    console.log('Submitting code:', manualCode);
    showAlert(`Code "${manualCode}" submitted! (Simulation)`);
    setManualCode('');
  };

  const handleScanClick = () => {
    // --- Open custom modal instead of alert ---
    setIsScannerOpen(true);
  };

  // --- New handler for scan result ---
  const handleScanResult = (result: string) => {
    setIsScannerOpen(false);
    showAlert(`Scanned Code: ${result}`);
    // Here you would typically also submit this code, e.g.:
    // console.log('Submitting scanned code:', result);
  };

  // Run API in each 5 seconds to fetch new notifications
  useEffect(() => {
    if (!profile?.uid) return;

    const interval = setInterval(() => {
      async function refreshProfile() {
        try {
          const { record } = await pb.collection('users').authRefresh();
          updateProfile({
            total_points: record.total_points || 0,
          })
        } catch (error) {
          console.error('Error refreshing profile:', error);
        }
      }
      refreshProfile();
    }, 5000);
    return () => clearInterval(interval);
  }, [profile?.uid]);


  return (
    <>
      {/* Top Navigation Bar */}
      <div className="navbar bg-base-100 shadow-sm sticky top-0 z-50">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl normal-case">Jyeshtha Motors</a>
        </div>
        <div className="flex-none">
          <button
            className="btn btn-ghost btn-circle"
            onClick={() =>
              (
                document.getElementById('notification_modal') as HTMLDialogElement
              )?.showModal()
            }
          >
            <div className="indicator">
              <Bell size={20} />
              <span className="badge badge-xs badge-primary indicator-item"></span>
            </div>
          </button>
          <button
            className="btn btn-ghost btn-circle"
            onClick={() =>
              (
                document.getElementById('profile_modal') as HTMLDialogElement
              )?.showModal()
            }
          >
            <User size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="grow flex flex-col items-center p-4">
        <div className="w-full max-w-md">
          {/* Points & Redeem Card */}
          <div className="card bg-primary text-primary-content shadow-lg mb-4">
            <div className="card-body">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="card-title opacity-80">Total Points</h2>
                  <p className="text-4xl font-bold">
                    {profile?.total_points.toLocaleString()}
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={onRedeemClick} // Updated to open modal
                >
                  <Gift size={18} className="mr-1" />
                  Redeem
                </button>
              </div>
            </div>
          </div>

          {/* Manual Code Entry Card */}
          <div className="card bg-base-100 shadow-md mb-6">
            <div className="card-body p-4">
              <form onSubmit={handleManualCodeSubmit}>
                <div className="form-control">
                  <label className="label pt-0">
                    <span className="label-text">Enter Code Manually</span>
                  </label>
                  <div className="join w-full">
                    <input
                      type="text"
                      placeholder="e.g., A1B2-C3D4"
                      className="input input-bordered join-item w-full"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary join-item">
                      Submit
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Scan Button (Main CTA) */}
          <div className="text-center my-6 grow">
            <button
              className="btn btn-accent btn-lg h-40 w-40 rounded-full shadow-lg flex-col gap-2"
              onClick={handleScanClick} // Updated
            >
              <QrCode size={48} />
              <span className="text-lg">Scan Code</span>
            </button>
          </div>

          {/* Activity Tabs Section */}
          <div className="mt-4">
            {/* --- Updated Tab List --- */}
            <div role="tablist" className="tabs tabs-boxed mb-3 bg-base-100/50">
              <a
                role="tab"
                className={`tab ${activeTab === 'recent' ? 'tab-active font-semibold' : ''
                  }`}
                onClick={() => setActiveTab('recent')}
              >
                My Activity
              </a>
              <a
                role="tab"
                className={`tab ${activeTab === 'redeem' ? 'tab-active font-semibold' : ''
                  }`}
                onClick={() => setActiveTab('redeem')}
              >
                My History
              </a>
              {/* --- New Tab --- */}
              <a
                role="tab"
                className={`tab ${activeTab === 'requests' ? 'tab-active font-semibold' : ''
                  }`}
                onClick={() => setActiveTab('requests')}
              >
                Redeem Requests
              </a>
            </div>

            <div className="bg-base-100 rounded-box shadow-md overflow-hidden">
              {activeTab === 'recent' && (
                <ul className="divide-y divide-base-200">
                  {transactions.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} />
                  ))}
                </ul>
              )}
              {activeTab === 'redeem' && (
                <ul className="divide-y divide-base-200">
                  {redeemHistory.length > 0 ? (
                    redeemHistory.map((tx) => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))
                  ) : (
                    <li className="p-6 text-center text-base-content/70">
                      You haven't redeemed any rewards yet.
                    </li>
                  )}
                </ul>
              )}
              {/* --- New Tab Panel --- */}
              {activeTab === 'requests' && (
                <ul className="divide-y divide-base-200">
                  {redeemRequests.length > 0 ? (
                    redeemRequests.map((req) => (
                      <RedeemRequestItem key={req.id} request={req} />
                    ))
                  ) : (
                    <li className="p-6 text-center text-base-content/70">
                      You have no redemption requests.
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- NEW QR SCANNER MODAL --- */}
      {isScannerOpen && (
        <QRScannerModal
          onClose={() => setIsScannerOpen(false)}
          onScan={handleScanResult}
        />
      )}
    </>
  );
}

// --- REDEEM MODAL CONTENT COMPONENT ---

type RedeemModalProps = {
  rewards: Reward[];
  onRedeemClick: (reward: Reward) => void;
};

function RedeemModalContent({
  rewards,
  onRedeemClick,
}: RedeemModalProps) {

  const { profile, setProfile } = useProfileStore();

  const redeemableValue = (profile?.total_points! / 100).toFixed(2); // 100 points = ₹1

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
              <p className="opacity-90 text-sm">
                {profile?.total_points?.toLocaleString()} Points Available
              </p>
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

// --- TRANSACTION ITEM COMPONENT ---

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isEarn = transaction.type === 'earn';
  const pointsColor = isEarn ? 'text-success' : 'text-error';
  const Icon = isEarn ? TrendingUp : TrendingDown;

  return (
    <li className="flex items-center justify-between p-4 hover:bg-base-200 transition-colors">
      <div className="flex items-center">
        <div
          className={`mr-3 p-2 rounded-full ${isEarn ? 'bg-success/10' : 'bg-error/10'
            }`}
        >
          <Icon size={20} className={isEarn ? 'text-success' : 'text-error'} />
        </div>
        <div>
          <p className="font-semibold text-base-content">{transaction.title}</p>
          <p className="text-sm text-base-content/70">{transaction.date}</p>
        </div>
      </div>
      <div className="flex items-center">
        <span className={`font-bold mr-2 ${pointsColor}`}>
          {isEarn ? '+' : ''}
          {transaction.points}
        </span>
        <ChevronRight size={18} className="text-base-content/30" />
      </div>
    </li>
  );
}

// --- NEW REDEEM REQUEST ITEM COMPONENT ---

function RedeemRequestItem({ request }: { request: RedeemRequest }) {
  let StatusIcon: React.ElementType;
  let statusColorClass: string;

  switch (request.status) {
    case 'Accepted':
      StatusIcon = CheckCircle;
      statusColorClass = 'badge-success';
      break;
    case 'Rejected':
      StatusIcon = XCircle;
      statusColorClass = 'badge-error';
      break;
    case 'Pending':
    default:
      StatusIcon = AlertCircle;
      statusColorClass = 'badge-warning';
      break;
  }

  return (
    <li className="p-4 hover:bg-base-200 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="mr-3 p-2 rounded-full bg-primary/10">
            <Gift size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-base-content">{request.title}</p>
            <p className="text-sm text-base-content/70">{request.date}</p>
          </div>
        </div>
        <div className="flex items-center">
          <span className="font-bold mr-2 text-error">
            -{request.points.toLocaleString()}
          </span>
          <ChevronRight size={18} className="text-base-content/30" />
        </div>
      </div>
      <div className="pl-12">
        <div className={`badge ${statusColorClass} gap-1.5`}>
          <StatusIcon size={14} />
          {request.status}
        </div>
        {request.message && (
          <p className="text-sm text-base-content/80 mt-1.5">
            {request.message}
          </p>
        )}
      </div>
    </li>
  );
}

// --- NEW QR SCANNER MODAL COMPONENT ---

type QRScannerModalProps = {
  onClose: () => void;
  onScan: (result: string) => void;
};

function QRScannerModal({ onClose, onScan }: QRScannerModalProps) {
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = (result: any) => {
    // The library returns an array of results
    if (result && result.length > 0) {
      onScan(result[0].rawValue);
    }
  };

  const handleError = (err: unknown) => {
    console.error('QR Scan Error:', err);
    setScanError('An unknown error occurred.');
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Scanner Viewport */}
      <div className="relative w-full max-w-md bg-neutral rounded-box shadow-2xl overflow-hidden aspect-square">
        <Scanner
          onScan={handleScan}
          onError={handleError}
          constraints={{
            facingMode: 'environment', // Use rear camera
          }}
          styles={{
            container: {
              width: '100%',
              height: '100%',
              paddingTop: '0', // Override default
            },
            video: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          }}
        />
        {/* Scanning Box Overlay */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="w-full h-full border-4 border-white/50 rounded-lg shadow-inner-lg" />
        </div>
      </div>

      {/* Close Button */}
      <button
        className="btn btn-circle btn-ghost text-white mt-6"
        onClick={onClose}
      >
        <X size={32} />
      </button>

      {/* Error Message */}
      {scanError && (
        <div className="text-center text-error bg-error/20 p-3 rounded-md mt-4 max-w-md">
          <p className="font-semibold">Could not start scanner</p>
          <p className="text-sm">{scanError}</p>
        </div>
      )}
    </div>
  );
}

export default App; // Renamed default export