// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Your web app's Firebase configuration (copy from app.js)
const firebaseConfig = {
    apiKey: "AIzaSyCldfDsgTCDt0By2Yev0zrY730ck235I18",
    authDomain: "rekap-penjualan-f7b06.firebaseapp.com",
    projectId: "rekap-penjualan-f7b06",
    storageBucket: "rekap-penjualan-f7b06.firebasestorage.app",
    messagingSenderId: "533820584568",
    appId: "1:533820584568:web:38f6ede9b66df24737738d",
    measurementId: "G-J5XT2V7YFN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const rekapTableBody = document.getElementById('rekapTableBody');
const rekapLoadingIndicator = document.getElementById('rekapLoadingIndicator');
const rekapTableContainer = document.getElementById('rekapTableContainer'); // This is now the div with overflow
const rekapTableWrapper = document.getElementById('rekapTableWrapper'); // New wrapper for fullscreen
const totalPenjualanContainer = document.getElementById('totalPenjualanContainer');
const totalPenjualanValue = document.getElementById('totalPenjualanValue');
const expandTableButton = document.getElementById('expandTableButton');


// Function to set the active navigation link based on the current page
function setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.main-nav .nav-link');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

// Function to parse harga string with M/Jt suffixes
function parseHarga(hargaString) {
    if (!hargaString) return 0;

    let cleanedHarga = String(hargaString).replace(/\s/g, '').toLowerCase(); // Remove spaces and convert to lowercase
    let value = 0;

    // Check for 'm' (million/miliar) suffix
    if (cleanedHarga.endsWith('m')) {
        value = parseFloat(cleanedHarga.slice(0, -1)) * 1_000_000_000; // Assuming 'M' means Billion
    }
    // Check for 'jt' (juta) suffix
    else if (cleanedHarga.endsWith('jt')) {
        value = parseFloat(cleanedHarga.slice(0, -2)) * 1_000_000; // Assuming 'Jt' means Million
    }
    // Otherwise, parse as a regular number
    else {
        value = parseFloat(cleanedHarga.replace(/[^0-9.-]+/g, '')); // Remove non-numeric chars except . and -
    }

    return isNaN(value) ? 0 : value;
}


// Function to populate the rekap table
function populateRekapTable(listings) {
    rekapTableBody.innerHTML = ''; // Clear existing rows
    let totalHargaSudahAkad = 0; // Initialize total for 'sudah akad'

    if (listings.length === 0) {
        rekapTableBody.innerHTML = '<tr><td colspan="13" style="text-align: center;">Tidak ada data penjualan ditemukan.</td></tr>';
        totalPenjualanContainer.style.display = 'none'; // Hide total if no data
        return;
    }

    listings.forEach((listing, index) => {
        // Determine status class for the row
        const status = listing.status ? listing.status.toLowerCase() : 'free';
        let statusClass = '';
        switch (status) {
            case 'free':
            case 'hold': // 'hold' status will now also have no specific background color
                statusClass = 'status-free-row';
                break;
            case 'naik booking':
                statusClass = 'status-naik-booking-row';
                break;
            case 'sudah akad': // Changed from 'naik akad' to 'sudah akad'
                statusClass = 'status-sudah-akad-row'; // New class for 'sudah akad'
                // Add to total if status is 'sudah akad'
                const harga = parseHarga(listing.harga); // Use the new parseHarga function
                if (!isNaN(harga)) {
                    totalHargaSudahAkad += harga;
                }
                break;
            case 'batal': // New case for 'batal' status
                statusClass = 'status-batal-row';
                break;
            default:
                statusClass = 'status-free-row';
        }

        const row = rekapTableBody.insertRow();
        row.classList.add(statusClass);

        // Helper to get formatted date or 'N/A'
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return isNaN(date) ? dateString : date.toLocaleDateString('id-ID'); // Format as local date string
        };

        // Helper to get formatted timestamp or 'N/A'
        const formatTimestamp = (timestamp) => {
            if (!timestamp) return 'N/A';
            // Firestore Timestamps have .seconds and .nanoseconds
            const date = new Date(timestamp.seconds * 1000);
            return isNaN(date) ? 'N/A' : date.toLocaleString('id-ID'); // Format as local date and time
        };

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${listing.namaKonsumen || 'N/A'}</td>
            <td>${listing.blok || 'N/A'}</td>
            <td>${listing.carabayar || 'N/A'}</td>
            <td>${listing.harga || 'N/A'}</td>
            <td>${listing.marketing || 'N/A'}</td>
            <td>${listing.kantor || 'N/A'}</td>
            <td>${formatDate(listing.tglhold)}</td>
            <td>${formatDate(listing.tglbook)}</td>
            <td>${formatDate(listing.tglakad)}</td>
            <td class="status-cell">${listing.status || 'Free'}</td>
            <td>${formatTimestamp(listing.timestamp)}</td>
            <td>${formatTimestamp(listing.lastUpdated)}</td>
        `;
    });

    // Update the total penjualan display
    totalPenjualanValue.textContent = totalHargaSudahAkad.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    totalPenjualanContainer.style.display = 'block'; // Show the total container
}

// Listen for real-time updates from Firestore
if (rekapLoadingIndicator) {
    rekapLoadingIndicator.style.display = 'flex';
}
if (rekapTableWrapper) { // Use the wrapper here
    rekapTableWrapper.style.display = 'none';
}
if (totalPenjualanContainer) {
    totalPenjualanContainer.style.display = 'none'; // Hide total container initially
}

onSnapshot(query(collection(db, "listings")), (snapshot) => {
    let listings = [];
    snapshot.forEach((doc) => {
        listings.push({ id: doc.id, ...doc.data() });
    });

    // Filter out listings with 'free' status
    let filteredListings = listings.filter(listing => {
        const status = listing.status ? listing.status.toLowerCase() : 'free';
        return status !== 'free';
    });

    // Sort listings by timestamp in ascending order (most recent at the bottom)
    filteredListings.sort((a, b) => {
        const timestampA = a.timestamp ? a.timestamp.seconds : 0;
        const timestampB = b.timestamp ? b.timestamp.seconds : 0;
        return timestampA - timestampB;
    });

    populateRekapTable(filteredListings);

    if (rekapLoadingIndicator) {
        rekapLoadingIndicator.style.display = 'none';
    }
    if (rekapTableWrapper) { // Use the wrapper here
        rekapTableWrapper.style.display = 'block';
    }
}, (error) => {
    console.error("Error fetching rekap data:", error);
    if (rekapLoadingIndicator) {
        rekapLoadingIndicator.style.display = 'none';
    }
    if (rekapTableWrapper) { // Use the wrapper here
        rekapTableWrapper.innerHTML = '<p style="text-align: center;">Error memuat data rekap penjualan. Silakan coba lagi.</p>';
        rekapTableWrapper.style.display = 'block';
    }
});

// Expand/Collapse Table functionality
expandTableButton.addEventListener('click', () => {
    rekapTableWrapper.classList.toggle('fullscreen');
    const icon = expandTableButton.querySelector('i');
    if (rekapTableWrapper.classList.contains('fullscreen')) {
        icon.classList.remove('fa-expand');
        icon.classList.add('fa-compress');
        // Request fullscreen API if available
        if (rekapTableWrapper.requestFullscreen) {
            rekapTableWrapper.requestFullscreen();
        } else if (rekapTableWrapper.mozRequestFullScreen) { /* Firefox */
            rekapTableWrapper.mozRequestFullScreen();
        } else if (rekapTableWrapper.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            rekapTableWrapper.webkitRequestFullscreen();
        } else if (rekapTableWrapper.msRequestFullscreen) { /* IE/Edge */
            rekapTableWrapper.msRequestFullscreen();
        }
    } else {
        icon.classList.remove('fa-compress');
        icon.classList.add('fa-expand');
        // Exit fullscreen API if available
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari & Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    }
});


// Call functions on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    setActiveNavLink();
});
