// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Your web app's Firebase configuration (hardcoded as requested)
const firebaseConfig = {
    apiKey: "AIzaSyDCBHPhqoUO8TbJtSrkUw02ky6q1K323U0",
    authDomain: "rekappenjualan-f6c18.firebaseapp.com",
    projectId: "rekappenjualan-f6c18",
    storageBucket: "rekappenjualan-f6c18.firebasestorage.app",
    messagingSenderId: "873790251698",
    appId: "1:873790251698:web:038cfe475c1f1104981fab",
    measurementId: "G-203C026FGM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get projectId from URL
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');

const rekapTableBody = document.getElementById('rekapTableBody');
const rekapLoadingIndicator = document.getElementById('rekapLoadingIndicator');
const rekapTableContainer = document.getElementById('rekapTableContainer');
const rekapTableWrapper = document.getElementById('rekapTableWrapper');
const totalPenjualanContainer = document.getElementById('totalPenjualanContainer');

const totalSudahAkadValue = document.getElementById('totalSudahAkadValue');
const totalNaikBookingValue = document.getElementById('totalNaikBookingValue');
const totalHoldValue = document.getElementById('totalHoldValue');
const totalOverallSalesValue = document.getElementById('totalOverallSalesValue');

const expandTableButton = document.getElementById('expandTableButton');
const exportCsvButton = document.getElementById('exportCsvButton');
const mainHeaderTitle = document.getElementById('mainHeaderTitle');

let allFetchedListingsForCsv = [];

const statusSortOrder = {
    'free': 1,
    'hold': 2,
    'naik booking': 3,
    'sudah akad': 4,
    'batal': 5
};

let currentProjectName = '';

function capitalizeWords(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

async function setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.main-nav .nav-link');

    navLinks.forEach(link => {
        link.style.pointerEvents = 'none';
        link.style.opacity = '0.5';
    });

    const mainHeaderTitle = document.getElementById('mainHeaderTitle');
    if (mainHeaderTitle) {
        if (projectId) {
            try {
                const projectDocRef = doc(db, 'projects', projectId);
                const projectSnap = await getDoc(projectDocRef);
                if (projectSnap.exists()) {
                    currentProjectName = projectSnap.data().name;
                    mainHeaderTitle.textContent = `Rekap ${capitalizeWords(currentProjectName)}`;
                } else {
                    mainHeaderTitle.textContent = `Rekap (Proyek Tidak Ditemukan)`;
                }
            } catch (error) {
                console.error("Error fetching project name for header:", error);
                mainHeaderTitle.textContent = `Rekap (Error)`;
            }
        } else {
            let baseTitle = "Form Rekap Penjualan";
            if (currentPath === 'index.html') {
                baseTitle = "Pilih Proyek Penjualan";
            } else if (currentPath === 'search.html') {
                baseTitle = "Cari & Lihat Listing";
            } else if (currentPath === 'rekap.html') {
                baseTitle = "Rekap Penjualan Unit";
            } else if (currentPath === 'update.html') {
                baseTitle = "Edit Listing";
            }
            mainHeaderTitle.textContent = baseTitle;
        }
    }


    navLinks.forEach(link => {
        link.classList.remove('active');
        let linkBaseHref = link.getAttribute('href').split('?')[0];

        if (linkBaseHref !== 'index.html') {
            if (projectId) {
                link.setAttribute('href', `${linkBaseHref}?projectId=${projectId}`);
            } else {
                link.setAttribute('href', linkBaseHref);
            }
        }
        
        if (currentPath === linkBaseHref) {
            link.classList.add('active');
        }
    });

    navLinks.forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.opacity = '1';
    });
}

function parseHarga(hargaString) {
    if (!hargaString) return 0;

    let cleanedHarga = String(hargaString).replace(/\s/g, '').toLowerCase();
    let value = 0;

    if (cleanedHarga.endsWith('m')) {
        value = parseFloat(cleanedHarga.slice(0, -1)) * 1_000_000_000;
    } else if (cleanedHarga.endsWith('jt')) {
        value = parseFloat(cleanedHarga.slice(0, -2)) * 1_000_000;
    } else {
        value = parseFloat(cleanedHarga.replace(/[^0-9.-]+/g, ''));
    }

    return isNaN(value) ? 0 : value;
}


function populateRekapTable(listings) {
    rekapTableBody.innerHTML = '';
    let totalSudahAkad = 0;
    let totalNaikBooking = 0;
    let totalHold = 0;
    let totalOverallSales = 0;

    if (listings.length === 0) {
        rekapTableBody.innerHTML = '<tr><td colspan="14" style="text-align: center;">Tidak ada data penjualan ditemukan.</td></tr>';
        totalPenjualanContainer.style.display = 'none';
        return;
    }

    listings.forEach((listing, index) => {
        const status = listing.status ? listing.status.toLowerCase() : 'free';
        let statusClass = '';
        const harga = parseHarga(listing.harga);

        switch (status) {
            case 'free':
                statusClass = 'status-free-row';
                break;
            case 'hold':
                statusClass = 'status-hold-row';
                totalHold += harga;
                break;
            case 'naik booking':
                statusClass = 'status-naik-booking-row';
                totalNaikBooking += harga;
                break;
            case 'sudah akad':
                statusClass = 'status-sudah-akad-row';
                totalSudahAkad += harga;
                break;
            case 'batal':
                statusClass = 'status-batal-row';
                break;
            default:
                statusClass = 'status-free-row';
        }

        if (status !== 'free' && status !== 'batal') {
            totalOverallSales += harga;
        }


        const row = rekapTableBody.insertRow();
        row.classList.add(statusClass);

        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return isNaN(date) ? dateString : date.toLocaleDateString('id-ID');
        };

        const formatTimestamp = (timestamp) => {
            if (!timestamp) return 'N/A';
            const date = new Date(timestamp.seconds * 1000);
            return isNaN(date) ? 'N/A' : date.toLocaleString('id-ID');
        };

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${listing.namaKonsumen || 'N/A'}</td>
            <td>${listing.tipe || 'N/A'}</td>
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

    totalSudahAkadValue.textContent = totalSudahAkad.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    totalNaikBookingValue.textContent = totalNaikBooking.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    totalHoldValue.textContent = totalHold.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    totalOverallSalesValue.textContent = totalOverallSales.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

    totalPenjualanContainer.style.display = 'block';
}

function exportToCsv(data) {
    const headers = [
        "No.", "Nama Konsumen", "Tipe", "Blok/Nomor", "Cara Bayar", "Harga",
        "Marketing", "Kantor", "Tgl Hold", "Tgl Book", "Tgl Akad", "Status",
        "Ditambahkan Pada", "Terakhir Diperbarui"
    ];

    const rows = data.map((listing, index) => {
        const formatDateForCsv = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return isNaN(date) ? dateString : date.toLocaleDateString('en-CA');
        };
        const formatTimestampForCsv = (timestamp) => {
            if (!timestamp) return '';
            const date = new Date(timestamp.seconds * 1000);
            return isNaN(date) ? '' : date.toLocaleString('en-CA');
        };

        return [
            index + 1,
            `"${(listing.namaKonsumen || '').replace(/"/g, '""')}"`,
            `"${(listing.tipe || '').replace(/"/g, '""')}"`,
            `"${(listing.blok || '').replace(/"/g, '""')}"`,
            `"${(listing.carabayar || '').replace(/"/g, '""')}"`,
            `"${(listing.harga || '').replace(/"/g, '""')}"`,
            `"${(listing.marketing || '').replace(/"/g, '""')}"`,
            `"${(listing.kantor || '').replace(/"/g, '""')}"`,
            `"${formatDateForCsv(listing.tglhold)}"`,
            `"${formatDateForCsv(listing.tglbook)}"`,
            `"${formatDateForCsv(listing.tglakad)}"`,
            `"${(listing.status || '').replace(/"/g, '""')}"`,
            `"${formatTimestampForCsv(listing.timestamp)}"`,
            `"${formatTimestampForCsv(listing.lastUpdated)}"`
        ].join(',');
    });

    const csvContent = [
        headers.join(','),
        ...rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const fileName = `rekap-penjualan-${capitalizeWords(currentProjectName || 'data')}.csv`;
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


if (!projectId) {
    if (rekapLoadingIndicator) rekapLoadingIndicator.style.display = 'none';
    if (rekapTableWrapper) rekapTableWrapper.innerHTML = '<p style="text-align: center; color: red;">Error: Proyek belum dipilih. Silakan kembali ke halaman utama untuk memilih proyek.</p>';
    if (rekapTableWrapper) rekapTableWrapper.style.display = 'block';
    if (totalPenjualanContainer) totalPenjualanContainer.style.display = 'none';
} else {
    if (rekapLoadingIndicator) {
        rekapLoadingIndicator.style.display = 'flex';
    }
    if (rekapTableWrapper) {
        rekapTableWrapper.style.display = 'none';
    }
    if (totalPenjualanContainer) {
        totalPenjualanContainer.style.display = 'none';
    }

    onSnapshot(query(collection(db, `projects/${projectId}/listings`)), (snapshot) => {
        let listings = [];
        snapshot.forEach((doc) => {
            listings.push({ id: doc.id, ...doc.data() });
        });

        allFetchedListingsForCsv = listings;

        let allListings = listings;

        allListings.sort((a, b) => {
            const statusA = a.status ? a.status.toLowerCase() : 'free';
            const statusB = b.status ? b.status.toLowerCase() : 'free';

            const orderA = statusSortOrder[statusA] || 99;
            const orderB = statusSortOrder[statusB] || 99;

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            const timestampA = a.timestamp ? a.timestamp.seconds : 0;
            const timestampB = b.timestamp ? b.timestamp.seconds : 0;
            return timestampA - timestampB;
        });

        populateRekapTable(allListings);

        if (rekapLoadingIndicator) {
            rekapLoadingIndicator.style.display = 'none';
        }
        if (rekapTableWrapper) {
            rekapTableWrapper.style.display = 'block';
        }
    }, (error) => {
        console.error("Error fetching rekap data:", error);
        if (rekapLoadingIndicator) {
            rekapLoadingIndicator.style.display = 'none';
        }
        if (rekapTableWrapper) {
            rekapTableWrapper.innerHTML = '<p style="text-align: center;">Error memuat data rekap penjualan. Silakan coba lagi.</p>';
            rekapTableWrapper.style.display = 'block';
        }
    });
}


expandTableButton.addEventListener('click', () => {
    rekapTableWrapper.classList.toggle('fullscreen');
    const icon = expandTableButton.querySelector('i');
    if (rekapTableWrapper.classList.contains('fullscreen')) {
        icon.classList.remove('fa-expand');
        icon.classList.add('fa-compress');
        if (rekapTableWrapper.requestFullscreen) {
            rekapTableWrapper.requestFullscreen();
        } else if (rekapTableWrapper.mozRequestFullScreen) {
            rekapTableWrapper.mozRequestFullScreen();
        } else if (rekapTableWrapper.webkitRequestFullscreen) {
            rekapTableWrapper.webkitRequestFullscreen();
        } else if (rekapTableWrapper.msRequestFullscreen) {
            rekapTableWrapper.msRequestFullscreen();
        }
    } else {
        icon.classList.remove('fa-compress');
        icon.classList.add('fa-expand');
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
});

exportCsvButton.addEventListener('click', () => {
    exportToCsv(allFetchedListingsForCsv);
});


document.addEventListener('DOMContentLoaded', () => {
    setActiveNavLink();
});
