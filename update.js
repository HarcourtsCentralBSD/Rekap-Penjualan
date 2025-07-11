// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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

const editListingForm = document.getElementById('editListingForm');
const successModal = document.getElementById('successModal'); // Generic success modal
const modalMessage = document.getElementById('modalMessage');
const closeSuccessModalButton = document.getElementById('closeSuccessModalButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const batalButton = document.getElementById('batalButton'); // Get the Batal button

// Batal Confirmation Modal elements
const batalConfirmModal = document.getElementById('batalConfirmModal');
const batalYesButton = document.getElementById('batalYesButton');
const batalNoButton = document.getElementById('batalNoButton');


let currentListingId = null; // To store the ID of the listing being edited
let originalListingData = null; // To store original data for creating new child

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

// Function to show generic success modal with optional redirect
function showSuccessModal(message, redirectUrl = null) {
    modalMessage.textContent = message;
    successModal.classList.add('active');

    // Remove previous event listener to prevent multiple redirects
    const oldListener = closeSuccessModalButton._currentListener;
    if (oldListener) {
        closeSuccessModalButton.removeEventListener('click', oldListener);
    }

    const newListener = () => {
        successModal.classList.remove('active'); // Always close the modal
        if (redirectUrl) {
            window.location.href = redirectUrl; // Redirect only if redirectUrl is provided
        }
        // If redirectUrl is null, no redirection happens, and the user stays on the current page
        // with their filled form fields.
    };
    closeSuccessModalButton.addEventListener('click', newListener);
    closeSuccessModalButton._currentListener = newListener; // Store listener for removal
}


// Function to fetch and populate listing data
async function fetchAndPopulateListing() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    if (editListingForm) {
        editListingForm.style.display = 'none';
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentListingId = urlParams.get('id');
    console.log("Attempting to fetch listing with ID:", currentListingId);

    if (!currentListingId) {
        console.error("No listing ID found in URL.");
        showSuccessModal("Error: No listing ID provided.");
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        return;
    }

    try {
        const listingRef = doc(db, 'listings', currentListingId);
        const listingSnap = await getDoc(listingRef);

        if (listingSnap.exists()) {
            originalListingData = listingSnap.data(); // Store original data
            console.log("Document data fetched:", originalListingData);

            document.getElementById('namaKonsumen').value = originalListingData.namaKonsumen || '';
            document.getElementById('tipe').value = originalListingData.tipe || '';
            document.getElementById('blok').value = originalListingData.blok || '';
            document.getElementById('carabayar').value = originalListingData.carabayar || '';
            document.getElementById('harga').value = originalListingData.harga || '';
            document.getElementById('marketing').value = originalListingData.marketing || '';
            document.getElementById('kantor').value = originalListingData.kantor || '';
            document.getElementById('tglhold').value = originalListingData.tglhold || '';
            document.getElementById('tglbook').value = originalListingData.tglbook || '';
            document.getElementById('tglakad').value = originalListingData.tglakad || '';
            document.getElementById('status').value = originalListingData.status || 'free';
            console.log("Form fields populated.");
        } else {
            console.error("No such document exists for ID:", currentListingId);
            showSuccessModal("Error: Listing not found.");
        }
    } catch (error) {
        console.error("Error fetching document:", error);
        showSuccessModal("Error fetching listing data. Please try again.");
    } finally {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        if (editListingForm) {
            editListingForm.style.display = 'block';
        }
    }
}

// Helper function for validation
function validateField(elementId, fieldName) {
    const field = document.getElementById(elementId);
    if (!field || field.value.trim() === '') {
        field.classList.add('input-error');
        return `${fieldName} harus diisi.`;
    }
    field.classList.remove('input-error');
    return null;
}

// Handle form submission for updating listing
editListingForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    if (!currentListingId) {
        showSuccessModal("Error: Cannot save changes, no listing ID.");
        return;
    }

    const namaKonsumen = document.getElementById('namaKonsumen').value.trim();
    const tipe = document.getElementById('tipe').value.trim();
    const blok = document.getElementById('blok').value.trim();
    const carabayar = document.getElementById('carabayar').value.trim();
    const harga = document.getElementById('harga').value.trim();
    const marketing = document.getElementById('marketing').value.trim();
    const kantor = document.getElementById('kantor').value.trim();
    const tglhold = document.getElementById('tglhold').value.trim();
    const tglbook = document.getElementById('tglbook').value.trim();
    const tglakad = document.getElementById('tglakad').value.trim();

    let errors = [];

    // Validation logic based on date fields
    if (tglakad) {
        errors.push(validateField('namaKonsumen', 'Nama Konsumen'));
        errors.push(validateField('tipe', 'Tipe'));
        errors.push(validateField('blok', 'Blok/Nomor'));
        errors.push(validateField('carabayar', 'Cara Bayar'));
        errors.push(validateField('harga', 'Harga'));
        errors.push(validateField('marketing', 'Marketing'));
        errors.push(validateField('kantor', 'Kantor'));
        errors.push(validateField('tglhold', 'Tanggal Hold'));
        errors.push(validateField('tglbook', 'Tanggal Book'));
        errors.push(validateField('tglakad', 'Tanggal Akad'));
    } else if (tglbook) {
        errors.push(validateField('namaKonsumen', 'Nama Konsumen'));
        errors.push(validateField('tipe', 'Tipe'));
        errors.push(validateField('blok', 'Blok/Nomor'));
        errors.push(validateField('carabayar', 'Cara Bayar'));
        errors.push(validateField('harga', 'Harga'));
        errors.push(validateField('marketing', 'Marketing'));
        errors.push(validateField('kantor', 'Kantor'));
        errors.push(validateField('tglhold', 'Tanggal Hold'));
        errors.push(validateField('tglbook', 'Tanggal Book'));
    } else if (tglhold) {
        errors.push(validateField('namaKonsumen', 'Nama Konsumen'));
        errors.push(validateField('tipe', 'Tipe'));
        errors.push(validateField('blok', 'Blok/Nomor'));
        errors.push(validateField('carabayar', 'Cara Bayar'));
        errors.push(validateField('harga', 'Harga'));
        errors.push(validateField('marketing', 'Marketing'));
        errors.push(validateField('kantor', 'Kantor'));
        errors.push(validateField('tglhold', 'Tanggal Hold'));
    } else {
        errors.push(validateField('tipe', 'Tipe'));
        errors.push(validateField('blok', 'Blok/Nomor'));
    }

    errors = errors.filter(error => error !== null);

    if (errors.length > 0) {
        showSuccessModal("Harap lengkapi semua bidang yang diperlukan:\n" + errors.join('\n'));
        return;
    }

    let status = "free";
    if (tglakad) {
        status = "sudah akad";
    } else if (tglbook) {
        status = "naik booking";
    } else if (tglhold) {
        status = "hold";
    }

    const updatedData = {
        namaKonsumen: namaKonsumen,
        tipe: tipe,
        blok: blok,
        carabayar: carabayar,
        harga: harga,
        marketing: marketing,
        kantor: kantor,
        tglhold: tglhold,
        tglbook: tglbook,
        tglakad: tglakad,
        status: status,
        lastUpdated: new Date()
    };

    try {
        const listingRef = doc(db, 'listings', currentListingId);
        await updateDoc(listingRef, updatedData);
        console.log("Document successfully updated!");
        showSuccessModal('Listing berhasil diperbarui!'); // Default redirect to self (update.html)
    } catch (error) {
        console.error("Error updating document: ", error);
        showSuccessModal('Error memperbarui listing. Silakan coba lagi.'); // No redirect on error
    }
});

// Event listener for the Batal button (shows confirmation modal)
batalButton.addEventListener('click', () => {
    if (!currentListingId || !originalListingData) {
        showSuccessModal("Error: Tidak dapat membatalkan, data listing tidak tersedia.");
        return;
    }
    batalConfirmModal.classList.add('active'); // Show the confirmation modal
});

// Event listener for "Ya" button in Batal confirmation modal
batalYesButton.addEventListener('click', async () => {
    batalConfirmModal.classList.remove('active'); // Hide confirmation modal

    // 1. Update the current listing's status to "batal"
    try {
        const listingRef = doc(db, 'listings', currentListingId);
        await updateDoc(listingRef, {
            status: 'batal',
            lastUpdated: new Date()
        });
        console.log("Original listing status updated to 'batal'.");

        // 2. Create a new child listing with same tipe and blok, but other fields blank
        const newListingData = {
            tipe: originalListingData.tipe || '',
            blok: originalListingData.blok || '',
            namaKonsumen: '',
            carabayar: '',
            harga: '',
            marketing: '',
            kantor: '',
            tglhold: '',
            tglbook: '',
            tglakad: '',
            status: 'free', // New listing starts as 'free'
            timestamp: new Date() // New timestamp for the new listing
        };

        await addDoc(collection(db, 'listings'), newListingData);
        console.log("New blank listing created for cancelled unit.");

        // Show success modal and redirect to List Unit page
        showSuccessModal('Listing berhasil dibatalkan dan unit baru telah dibuat!', 'search.html');
    } catch (error) {
        console.error("Error processing batal action: ", error);
        showSuccessModal('Error membatalkan listing. Silakan coba lagi.'); // No redirect on error
    }
});

// Event listener for "Tidak" button in Batal confirmation modal
batalNoButton.addEventListener('click', () => {
    batalConfirmModal.classList.remove('active'); // Hide confirmation modal
});


// Call functions on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('goBackToListing').addEventListener('click', function() {
        window.location.href = 'search.html';
    });

    setActiveNavLink();
    fetchAndPopulateListing();
});
