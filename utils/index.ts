export const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
        return `${formattedDate} ${formattedTime}`;
    } catch (e) {
        return dateString.split('T')[0].split(' ')[0]; // fallback to raw date part
    }
};