// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"; // Added doc, getDoc

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
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Get projectId from URL
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');

const mainHeaderTitle = document.getElementById('mainHeaderTitle'); // Get the main header title element

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

// Call the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', setActiveNavLink);

// Custom modal for success messages
function showSuccessModal(message) {
    const modalOverlay = document.createElement('div');
    modalOverlay.classList.add('modal-overlay');
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-success-message">
                <i class="fas fa-check-circle success-icon"></i>
                <p>${message}</p>
                <button id="closeSuccessMessageButton">Oke</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);
    modalOverlay.classList.add('active');

    document.getElementById('closeSuccessMessageButton').addEventListener('click', () => {
        modalOverlay.classList.remove('active');
        modalOverlay.remove();
    });
}


document.getElementById('listingForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    if (!projectId) {
        showSuccessModal("Error: Proyek belum dipilih. Silakan pilih proyek dari halaman utama.");
        return;
    }

    const namaKonsumen = document.getElementById('namaKonsumen').value;
    const tipe = document.getElementById('tipe').value;
    const blok = document.getElementById('blok').value;
    const carabayar = document.getElementById('carabayar').value;
    const harga = document.getElementById('harga').value;
    const marketing = document.getElementById('marketing').value;
    const kantor = document.getElementById('kantor').value;
    const tglhold = document.getElementById('tglhold').value;
    const tglbook = document.getElementById('tglbook').value;
    const tglakad = document.getElementById('tglakad').value;

    let status = "free";
    if (tglakad) {
        status = "sudah akad";
    } else if (tglbook) {
        status = "naik booking";
    } else if (tglhold) {
        status = "hold";
    }

    const formData = {
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
        timestamp: new Date()
    };

    try {
        const docRef = await addDoc(collection(db, `projects/${projectId}/listings`), formData);
        console.log("Document written with ID: ", docRef.id);
        showSuccessModal('Listing submitted successfully!');
        this.reset();
    } catch (e) {
        console.error("Error adding document: ", e);
        showSuccessModal('Error submitting listing. Please try again.');
    }
});

// Update the "Lihat & Cari Semua Unit" button to include projectId
document.getElementById('goToSearchPage').addEventListener('click', function() {
    if (projectId) {
        window.location.href = `search.html?projectId=${projectId}`;
    } else {
        showSuccessModal("Error: Proyek belum dipilih. Tidak dapat melihat listing.");
    }
});
