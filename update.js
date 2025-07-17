// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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

const editListingForm = document.getElementById('editListingForm');
const successModal = document.getElementById('successModal');
const modalMessage = document.getElementById('modalMessage');
const closeSuccessModalButton = document.getElementById('closeSuccessModalButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const batalButton = document.getElementById('batalButton');

const batalConfirmModal = document.getElementById('batalConfirmModal');
const batalYesButton = document.getElementById('batalYesButton');
const batalNoButton = document.getElementById('batalNoButton');

// Get projectId from URL
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');

const mainHeaderTitle = document.getElementById('mainHeaderTitle'); // Get the main header title element


let currentListingId = null;
let originalListingData = null;

// Function to capitalize first letter of each word
function capitalizeWords(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Function to set the active navigation link and update header title
async function setActiveNavLink() { // Ensure it's async
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.main-nav .nav-link');
    // Re-enable links after all hrefs are set
    navLinks.forEach(link => {
        link.style.pointerEvents = 'none';
        link.style.opacity = '0.5';
    });
    // Update main header title
    if (projectId && mainHeaderTitle) {
        try {
            const projectDocRef = doc(db, 'projects', projectId); // Make sure 'doc' and 'db' are imported/available
            const projectSnap = await getDoc(projectDocRef); // Make sure 'getDoc' is imported
            if (projectSnap.exists()) {
                const projectName = projectSnap.data().name;
                mainHeaderTitle.textContent = `Rekap ${capitalizeWords(projectName)}`;
            } else {
                mainHeaderTitle.textContent = `Rekap (Proyek Tidak Ditemukan)`;
            }
        } catch (error) {
            console.error("Error fetching project name for header:", error);
            mainHeaderTitle.textContent = `Rekap (Error)`;
        }
    } else if (mainHeaderTitle) {
        // Default title if no project selected or on index.html
        // Determine base title based on current page
        let defaultTitle = "Form Rekap Penjualan"; // Default for form.html, etc.
        if (currentPath === 'index.html') {
            defaultTitle = "Pilih Proyek Penjualan";
        } else if (currentPath === 'search.html') {
            defaultTitle = "Cari & Lihat Listing"; // Or whatever the static title is
        } else if (currentPath === 'rekap.html') {
            defaultTitle = "Rekap Penjualan Unit"; // Or whatever the static title is
        } else if (currentPath === 'update.html') {
            defaultTitle = "Edit Listing"; // Or whatever the static title is
        }
        mainHeaderTitle.textContent = defaultTitle;
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
    // Re-enable links after all hrefs are set
    navLinks.forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.opacity = '1';
    });
}


function showSuccessModal(message, redirectUrl = null) {
    modalMessage.textContent = message;
    successModal.classList.add('active');

    const oldListener = closeSuccessModalButton._currentListener;
    if (oldListener) {
        closeSuccessModalButton.removeEventListener('click', oldListener);
    }

    const newListener = () => {
        successModal.classList.remove('active');
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    };
    closeSuccessModalButton.addEventListener('click', newListener);
    closeSuccessModalButton._currentListener = newListener;
}


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

    // Check for projectId first
    if (!projectId) {
        showSuccessModal("Error: Proyek belum dipilih. Silakan kembali ke halaman utama untuk memilih proyek.", "index.html"); // Redirect to index if no project
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        return;
    }

    if (!currentListingId) {
        console.error("No listing ID found in URL.");
        showSuccessModal("Error: No listing ID provided.", `search.html?projectId=${projectId}`); // Redirect to listing page if no ID
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        return;
    }

    try {
        const listingRef = doc(db, `projects/${projectId}/listings`, currentListingId);
        const listingSnap = await getDoc(listingRef);

        if (listingSnap.exists()) {
            originalListingData = listingSnap.data();
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
            showSuccessModal("Error: Listing not found.", `search.html?projectId=${projectId}`); // Redirect to listing page if not found
        }
    } catch (error) {
        console.error("Error fetching document:", error);
        showSuccessModal("Error fetching listing data. Please try again.", `search.html?projectId=${projectId}`); // Redirect on error
    } finally {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        if (editListingForm) {
            editListingForm.style.display = 'block';
        }
    }
}

function validateField(elementId, fieldName) {
    const field = document.getElementById(elementId);
    if (!field || field.value.trim() === '') {
        field.classList.add('input-error');
        return `${fieldName} harus diisi.`;
    }
    field.classList.remove('input-error');
    return null;
}

editListingForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    if (!projectId) {
        showSuccessModal("Error: Proyek belum dipilih. Silakan pilih proyek dari halaman utama.", "index.html");
        return;
    }

    if (!currentListingId) {
        showSuccessModal("Error: Cannot save changes, no listing ID.", `search.html?projectId=${projectId}`);
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
        const listingRef = doc(db, `projects/${projectId}/listings`, currentListingId);
        await updateDoc(listingRef, updatedData);
        console.log("Document successfully updated!");
        showSuccessModal('Listing berhasil diperbarui!');
    } catch (error) {
        console.error("Error updating document: ", error);
        showSuccessModal('Error memperbarui listing. Silakan coba lagi.');
    }
});

batalButton.addEventListener('click', () => {
    if (!projectId) {
        showSuccessModal("Error: Proyek belum dipilih. Silakan kembali ke halaman utama untuk memilih proyek.", "index.html");
        return;
    }
    if (!currentListingId || !originalListingData) {
        showSuccessModal("Error: Tidak dapat membatalkan, data listing tidak tersedia.", `search.html?projectId=${projectId}`);
        return;
    }
    batalConfirmModal.classList.add('active');
});

batalYesButton.addEventListener('click', async () => {
    batalConfirmModal.classList.remove('active');

    if (!projectId) {
        showSuccessModal("Error: Proyek belum dipilih. Silakan kembali ke halaman utama untuk memilih proyek.", "index.html");
        return;
    }

    try {
        const listingRef = doc(db, `projects/${projectId}/listings`, currentListingId);
        await updateDoc(listingRef, {
            status: 'batal',
            lastUpdated: new Date()
        });
        console.log("Original listing status updated to 'batal'.");

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
            status: 'free',
            timestamp: new Date()
        };

        await addDoc(collection(db, `projects/${projectId}/listings`), newListingData);
        console.log("New blank listing created for cancelled unit.");

        showSuccessModal('Listing berhasil dibatalkan dan unit baru telah dibuat!', `search.html?projectId=${projectId}`);
    } catch (error) {
        console.error("Error processing batal action: ", error);
        showSuccessModal('Error membatalkan listing. Silakan coba lagi.');
    }
});

batalNoButton.addEventListener('click', () => {
    batalConfirmModal.classList.remove('active');
});


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('goBackToListing').addEventListener('click', function() {
        if (projectId) {
            window.location.href = `search.html?projectId=${projectId}`;
        } else {
            window.location.href = 'search.html';
        }
    });

    setActiveNavLink();
    fetchAndPopulateListing();
});
