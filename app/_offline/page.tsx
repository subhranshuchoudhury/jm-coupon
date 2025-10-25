export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <h1 className="text-2xl font-bold mb-4">You’re offline</h1>
            <p className="text-gray-600">
                It seems you’ve lost your internet connection.
            </p>
            <p className="mt-2 text-sm text-gray-500">
                Don’t worry — you can still view cached pages!
            </p>
        </div>
    );
}
