"use client"; // Assuming Next.js App Router

import React, { useState } from 'react';
import {
  Bell,
  Gift,
  QrCode,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles, // Added for demo notification
  Coffee, // Added for demo notification
  ArrowLeft, // For Redeem page
  Ticket, // For Redeem page
  Car, // For Redeem page
  Percent, // For Redeem page
  X, // For modal close button
} from 'lucide-react';
// Import for QR Scanner removed as it was causing an error

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

const mockRewards = [
  { id: 'r1', title: '₹50 Voucher', points: 5000, icon: Ticket },
  { id: 'r2', title: 'Free Car Wash', points: 7500, icon: Car },
  { id: 'r3', title: '₹100 Voucher', points: 10000, icon: Ticket },
  { id: 'r4', title: '20% Off Service', points: 15000, icon: Percent },
];

type Transaction = (typeof mockTransactions)[0];
type Reward = (typeof mockRewards)[0];

// --- MAIN APP COMPONENT ---

/**
 * Main App component that renders the home page and global modals
 */
function App() {
  const [totalPoints, setTotalPoints] = useState(12450);
  const [alertMessage, setAlertMessage] = useState('');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  // --- New state for redemption form ---
  const [upiId, setUpiId] = useState('');
  const [fullName, setFullName] = useState('');

  // Helper function to show the global alert modal
  const showAlert = (message: string) => {
    setAlertMessage(message);
    (document.getElementById('alert_modal') as HTMLDialogElement)?.showModal();
  };

  // --- Redemption Logic ---

  // 1. When a reward is clicked in the modal
  const handleRedeemClick = (reward: Reward) => {
    setSelectedReward(reward);
    (document.getElementById('redeem_confirm_modal') as HTMLDialogElement)?.showModal();
  };

  // 2. When user confirms in the confirmation modal
  const handleRedemptionConfirm = () => {
    if (!selectedReward) return;

    // --- New Validation ---
    if (!upiId.trim()) {
      showAlert('UPI ID is mandatory. Please enter a valid UPI ID.');
      return; // Stop execution, keep modal open
    }
    // --- End Validation ---

    if (totalPoints >= selectedReward.points) {
      setTotalPoints((prevPoints) => prevPoints - selectedReward.points);

      // Log the data (simulation of sending to backend)
      console.log('Redemption Confirmed:', {
        reward: selectedReward.title,
        points: selectedReward.points,
        upiId: upiId,
        fullName: fullName || 'N/A',
      });

      // --- Manually close modals on success ---
      (document.getElementById('redeem_confirm_modal') as HTMLDialogElement)?.close();
      (document.getElementById('redeem_page_modal') as HTMLDialogElement)?.close();

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
    (document.getElementById('redeem_page_modal') as HTMLDialogElement)?.showModal();
  };


  return (
    <div className="flex flex-col min-h-screen bg-base-200">
      <HomePage
        totalPoints={totalPoints}
        transactions={mockTransactions}
        redeemHistory={mockRedeemHistory}
        onRedeemClick={openRedeemModal} // Pass function to open modal
        showAlert={showAlert}
      />

      {/* --- GLOBAL MODALS --- */}

      {/* Notification Modal (remains from HomePage) */}
      <dialog id="notification_modal" className="modal">
        {/* ... (modal content unchanged) ... */}
        <div className="modal-box">
          <h3 className="font-bold text-lg">Notifications</h3>
          <div className="py-4 space-y-4">
            {/* Demo Notifications */}
            <div className="flex items-start p-3 bg-base-200 rounded-lg gap-3">
              <Sparkles size={20} className="text-info mt-1 shrink-0" />
              <div>
                <p className="font-semibold">Welcome Bonus!</p>
                <p className="text-sm text-base-content/80">You've received 100 bonus points for joining.</p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-base-200 rounded-lg gap-3">
              <Coffee size={20} className="text-success mt-1 shrink-0" />
              <div>
                <p className="font-semibold">Redemption Successful</p>
                <p className="text-sm text-base-content/80">Your 'Free Coffee' reward has been redeemed.</p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-base-200 rounded-lg gap-3">
              <Gift size={20} className="text-accent mt-1 shrink-0" />
              <div>
                <p className="font-semibold">New Reward Available</p>
                <p className="text-sm text-base-content/80">Complete your profile to earn 50 extra points!</p>
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

      {/* Global Alert Modal (replaces window.alert) */}
      <dialog id="alert_modal" className="modal">
        {/* ... (modal content unchanged) ... */}
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

      {/* Redeem Page Modal (Replaces RedeemPage) */}
      <dialog id="redeem_page_modal" className="modal">
        {/* ... (modal content mostly unchanged) ... */}
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
            totalPoints={totalPoints}
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
              <button className="btn btn-ghost mr-2" onClick={handleRedemptionCancel}>
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
  onRedeemClick: () => void;
  showAlert: (message: string) => void;
};

function HomePage({
  totalPoints,
  transactions,
  redeemHistory,
  onRedeemClick,
  showAlert,
}: HomePageProps) {
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState('recent');

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    console.log('Submitting code:', manualCode);
    showAlert(`Code "${manualCode}" submitted! (Simulation)`);
    setManualCode('');
  };

  const handleScanClick = () => {
    showAlert('Opening scanner... (Simulation)');
  };

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
            onClick={() => (document.getElementById('notification_modal') as HTMLDialogElement)?.showModal()}
          >
            <div className="indicator">
              <Bell size={20} />
              <span className="badge badge-xs badge-primary indicator-item"></span>
            </div>
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
                    {totalPoints.toLocaleString()}
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
              onClick={handleScanClick}
            >
              <QrCode size={48} />
              <span className="text-lg">Scan Code</span>
            </button>
          </div>

          {/* Activity Tabs Section */}
          <div className="mt-4">
            <div role="tablist" className="tabs tabs-boxed mb-3 bg-base-100/50">
              <a
                role="tab"
                className={`tab ${activeTab === 'recent' ? 'tab-active font-semibold' : ''}`}
                onClick={() => setActiveTab('recent')}
              >
                Recent Activity
              </a>
              <a
                role="tab"
                className={`tab ${activeTab === 'redeem' ? 'tab-active font-semibold' : ''}`}
                onClick={() => setActiveTab('redeem')}
              >
                Redeem History
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
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// --- REDEEM MODAL CONTENT COMPONENT ---

type RedeemModalProps = {
  totalPoints: number;
  rewards: Reward[];
  onRedeemClick: (reward: Reward) => void;
};

function RedeemModalContent({
  totalPoints,
  rewards,
  onRedeemClick,
}: RedeemModalProps) {
  const redeemableValue = (totalPoints / 100).toFixed(2); // 100 points = ₹1

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
                {totalPoints.toLocaleString()} Points Available
              </p>
            </div>
          </div>

          {/* Rewards List */}
          <h3 className="text-lg font-semibold mb-3 text-base-content">
            Available Rewards
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {rewards.map((reward) => {
              const canAfford = totalPoints >= reward.points;
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
        <div className={`mr-3 p-2 rounded-full ${isEarn ? 'bg-success/10' : 'bg-error/10'}`}>
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

export default App; // Renamed default export

