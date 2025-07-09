// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Function to set the active navigation link based on the current page
function setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop(); // Get the current file name (e.g., "index.html")
    const navLinks = document.querySelectorAll('.main-nav .nav-link');

    navLinks.forEach(link => {
        // Remove active class from all links first
        link.classList.remove('active');

        // Check if the link's href matches the current page, or if it's the root and currentPath is empty
        if (link.getAttribute('href') === currentPath || (currentPath === '' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        }
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

    // Determine the status based on the date fields
    let status = "free";
    if (tglakad) {
        status = "sudah akad";
    } else if (tglbook) {
        status = "naik booking";
    } else if (tglhold) {
        status = "hold";
    }
    // If all are empty, status remains "free" as initialized

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
        status: status, // Add the new status field
        timestamp: new Date() // Add a timestamp for when the data was saved
    };

    try {
        // Data will now be saved directly to the 'listings' collection
        const docRef = await addDoc(collection(db, 'listings'), formData);
        console.log("Document written with ID: ", docRef.id);
        showSuccessModal('Listing submitted successfully!');
        this.reset(); // Clear the form fields
    } catch (e) {
        console.error("Error adding document: ", e);
        showSuccessModal('Error submitting listing. Please try again.');
    }
});
