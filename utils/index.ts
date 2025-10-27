export const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Use 'T' split if the date string includes time and you only want the date part
    const datePart = dateString.split('T')[0].split(' ')[0];
    try {
        return new Date(datePart).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch (e) {
        return datePart; // Fallback to raw string if date parsing fails
    }
};