// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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

const searchInput = document.getElementById('searchNamaListing');
const searchLoadingIndicator = document.getElementById('searchLoadingIndicator');
const dynamicSectionsContainer = document.getElementById('dynamicSectionsContainer'); // Main container for sections

// Filter type selector buttons
const filterTypeButtons = document.querySelectorAll('.filter-type-button');

// Global variable to store the ID of the listing to be deleted
let listingToDeleteId = null;
const DELETE_PASSWORD = "admin"; // Placeholder password

// Get modal elements
let deleteConfirmModal;
let deleteConfirmationForm;
let deletePasswordInput;
let passwordError;
let cancelDeleteButton;
let confirmDeleteButton;
let deleteSuccessMessage;
let closeSuccessMessageButton;

// Store all fetched listings
let allFetchedListings = [];
// Updated status order to include 'sudah akad'
const predefinedStatusOrder = ['free', 'hold', 'naik booking', 'sudah akad']; // Fixed order for status

// Current display type ('status' or 'tipe')
let currentDisplayType = 'status'; // Default display type


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

// Custom sorting function for Blok/Nomor (e.g., B21 before B23, B before J)
function sortBlocks(a, b) {
    const blockA = a.blok || '';
    const blockB = b.blok || '';

    // Extract leading letters and trailing numbers
    const re = /^([a-zA-Z]+)(\d*)$/;
    const matchA = blockA.match(re);
    const matchB = blockB.match(re);

    if (!matchA || !matchB) {
        return blockA.localeCompare(blockB); // Fallback to string comparison if format is unexpected
    }

    const lettersA = matchA[1];
    const numbersA = parseInt(matchA[2] || '0', 10); // Treat empty number as 0
    const lettersB = matchB[1];
    const numbersB = parseInt(matchB[2] || '0', 10);

    // Compare letters first
    const letterComparison = lettersA.localeCompare(lettersB);
    if (letterComparison !== 0) {
        return letterComparison;
    }

    // If letters are the same, compare numbers
    return numbersA - numbersB;
}


// Function to render sections based on currentDisplayType
function renderSections(listingsToDisplay) {
    dynamicSectionsContainer.innerHTML = ''; // Clear previous sections

    let categories = [];
    let categoryCounts = {};

    // Sort listingsToDisplay by Blok/Nomor before grouping
    listingsToDisplay.sort(sortBlocks);


    if (currentDisplayType === 'status') {
        categories = predefinedStatusOrder;
        predefinedStatusOrder.forEach(status => categoryCounts[status] = 0);
    } else if (currentDisplayType === 'tipe') {
        const uniqueTipes = new Set();
        listingsToDisplay.forEach(listing => {
            // Only add tipe if status is 'free' when tipe filter is active
            if (listing.tipe && (listing.status ? listing.status.toLowerCase() : 'free') === 'free') {
                uniqueTipes.add(listing.tipe.toLowerCase());
            }
        });
        categories = Array.from(uniqueTipes).sort();
        categories.forEach(tipe => categoryCounts[tipe] = 0);
    }

    // Populate categoryCounts
    listingsToDisplay.forEach(listing => {
        let categoryValue;
        if (currentDisplayType === 'status') {
            categoryValue = (listing.status ? listing.status.toLowerCase() : 'free');
            // Ensure 'naik akad' is mapped to 'sudah akad' for counting
            if (categoryValue === 'naik akad') categoryValue = 'sudah akad';
        } else if (currentDisplayType === 'tipe') {
            // Only count if status is 'free'
            if ((listing.status ? listing.status.toLowerCase() : 'free') !== 'free') {
                return; // Skip if not 'free' status
            }
            categoryValue = (listing.tipe ? listing.tipe.toLowerCase() : 'unknown'); // Use 'unknown' for missing tipe
        }

        if (categoryCounts.hasOwnProperty(categoryValue)) {
            categoryCounts[categoryValue]++;
        } else if (currentDisplayType === 'tipe') {
            // Add new tipe categories dynamically if not predefined
            categoryCounts[categoryValue] = (categoryCounts[categoryValue] || 0) + 1;
            if (!categories.includes(categoryValue)) {
                categories.push(categoryValue);
            }
        }
    });

    // Sort tipe categories if newly added
    if (currentDisplayType === 'tipe') {
        categories.sort();
    }


    categories.forEach(category => {
        const categoryId = category.replace(/\s/g, '-');
        const section = document.createElement('div');
        section.classList.add('status-section'); // Reusing class name for styling

        const header = document.createElement('div');
        header.classList.add('status-header');
        header.dataset.statusGroup = category; // Using data-status-group for consistency
        header.innerHTML = `
            <h4>${category.charAt(0).toUpperCase() + category.slice(1)} (<span id="count-${categoryId}">${categoryCounts[category] || 0}</span>) <i class="fas fa-chevron-down toggle-arrow"></i></h4>
        `;
        section.appendChild(header);

        const content = document.createElement('div');
        content.classList.add('status-content');
        content.id = `listings-${categoryId}`; // ID for content container
        content.style.display = 'none'; // Initially collapsed
        section.appendChild(content);

        dynamicSectionsContainer.appendChild(section);

        // Add toggle functionality to the header
        header.addEventListener('click', () => {
            if (content.style.display === 'block' || content.style.display === '') {
                content.style.display = 'none';
                header.querySelector('.toggle-arrow').classList.remove('fa-chevron-up');
                header.querySelector('.toggle-arrow').classList.add('fa-chevron-down');
            } else {
                content.style.display = 'block';
                header.querySelector('.toggle-arrow').classList.remove('fa-chevron-down');
                header.querySelector('.toggle-arrow').classList.add('fa-chevron-up');
            }
        });
    });

    // Now populate the content within each section
    listingsToDisplay.forEach(listing => {
        let categoryValue;
        if (currentDisplayType === 'status') {
            categoryValue = (listing.status ? listing.status.toLowerCase() : 'free');
            // Ensure 'naik akad' is mapped to 'sudah akad' for displaying
            if (categoryValue === 'naik akad') categoryValue = 'sudah akad';
        } else if (currentDisplayType === 'tipe') {
            // Only populate if status is 'free'
            if ((listing.status ? listing.status.toLowerCase() : 'free') !== 'free') {
                return; // Skip if not 'free' status
            }
            categoryValue = (listing.tipe ? listing.tipe.toLowerCase() : 'unknown');
        }
        const targetContainer = document.getElementById(`listings-${categoryValue.replace(/\s/g, '-')}`);

        if (targetContainer) {
            const listingItem = document.createElement('div');
            listingItem.classList.add('listing-item');
            listingItem.setAttribute('data-id', listing.id);

            listingItem.addEventListener('click', (event) => {
                if (event.target.closest('.delete-button')) {
                    return;
                }
                window.location.href = `update.html?id=${listing.id}`;
            });

            const timestamp = listing.timestamp ? new Date(listing.timestamp.seconds * 1000).toLocaleString() : 'N/A';

            listingItem.innerHTML = `
                <div class="listing-item-header">
                    <h4>${listing.tipe || 'N/A'}</h4>
                    <button class="delete-button" data-id="${listing.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <p><strong>Blok:</strong> ${listing.blok || 'N/A'}</p>
                <p><strong>Status:</strong> ${listing.status || 'Free'} </p>
                <small>Ditambahkan pada: ${timestamp}</small>
            `;
            targetContainer.appendChild(listingItem);

            const deleteButton = listingItem.querySelector('.delete-button');
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                listingToDeleteId = event.currentTarget.dataset.id;
                deletePasswordInput.value = '';
                passwordError.style.display = 'none';
                deleteConfirmationForm.style.display = 'block';
                deleteSuccessMessage.style.display = 'none';
                deleteConfirmModal.classList.add('active');
                console.log('Delete button clicked, modal should be active.');
            });
        }
    });

    // After rendering, manage section visibility and state based on search/filters
    manageSectionVisibilityAndState();
}

// Function to manage section visibility and collapse/expand state
function manageSectionVisibilityAndState() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    document.querySelectorAll('.status-section').forEach(section => {
        const header = section.querySelector('.status-header');
        const content = section.querySelector('.status-content');
        const arrow = header.querySelector('.toggle-arrow');
        const countSpan = header.querySelector('span');
        const currentCount = parseInt(countSpan.textContent);

        if (currentCount > 0) {
            section.style.display = 'block'; // Show the entire section
            if (searchTerm !== '') {
                content.style.display = 'block'; // Expand content if searching
                arrow.classList.remove('fa-chevron-down');
                arrow.classList.add('fa-chevron-up');
            } else {
                content.style.display = 'none'; // Collapse content if no search term
                arrow.classList.remove('fa-chevron-up');
                arrow.classList.add('fa-chevron-down');
            }
        } else {
            section.style.display = 'none'; // Hide section if no content
        }
    });
}


// Function to filter listings based on search input and current display type
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);

    const filteredListings = allFetchedListings.filter(listing => {
        // Apply search bar filter
        if (searchWords.length > 0) {
            const searchableText = [
                listing.tipe,
                listing.blok,
                listing.status,
                listing.namaKonsumen,
                listing.carabayar,
                listing.harga,
                listing.marketing,
                listing.kantor,
                listing.tglhold,
                listing.tglbook,
                listing.tglakad
            ].filter(Boolean).join(' ').toLowerCase();

            return searchWords.every(word => searchableText.includes(word));
        }
        return true; // If no search term, all listings pass this filter
    });

    renderSections(filteredListings); // Re-render sections with filtered data

    // If search bar is empty, show all sections and collapse them
    if (searchTerm === '') {
        document.querySelectorAll('.status-section').forEach(section => {
            section.style.display = 'block'; // Show all sections
            const content = section.querySelector('.status-content');
            const arrow = section.querySelector('.toggle-arrow');
            content.style.display = 'none'; // Collapse content
            arrow.classList.remove('fa-chevron-up');
            arrow.classList.add('fa-chevron-down');
        });
    }
}


// Listen for real-time updates from Firestore
if (searchLoadingIndicator) {
    searchLoadingIndicator.style.display = 'flex';
}
if (dynamicSectionsContainer) {
    dynamicSectionsContainer.style.display = 'none';
}

onSnapshot(query(collection(db, "listings")), (snapshot) => {
    allFetchedListings = [];
    snapshot.forEach((doc) => {
        allFetchedListings.push({ id: doc.id, ...doc.data() });
    });
    applyFilters(); // Apply filters to newly fetched data

    if (searchLoadingIndicator) {
        searchLoadingIndicator.style.display = 'none';
    }
    if (dynamicSectionsContainer) {
        dynamicSectionsContainer.style.display = 'block';
    }
}, (error) => {
    console.error("Error fetching listings:", error);
    if (searchLoadingIndicator) {
        searchLoadingIndicator.style.display = 'none';
    }
    if (dynamicSectionsContainer) {
        dynamicSectionsContainer.innerHTML = '<p>Error memuat daftar listing. Silakan coba lagi.</p>';
        dynamicSectionsContainer.style.display = 'block';
    }
});

// Search input event listener
searchInput.addEventListener('input', applyFilters);

// Filter type button click handlers
filterTypeButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterTypeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentDisplayType = button.dataset.filterDisplayType;
        applyFilters(); // Re-apply filters and re-render sections based on new display type
    });
});


// Call the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    deleteConfirmModal = document.getElementById('deleteConfirmModal');
    deleteConfirmationForm = document.getElementById('deleteConfirmationForm');
    deletePasswordInput = document.getElementById('deletePasswordInput');
    passwordError = document.getElementById('passwordError');
    cancelDeleteButton = document.getElementById('cancelDeleteButton');
    confirmDeleteButton = document.getElementById('confirmDeleteButton');
    deleteSuccessMessage = document.getElementById('deleteSuccessMessage');
    closeSuccessMessageButton = document.getElementById('closeSuccessMessageButton');

    if (cancelDeleteButton) {
        cancelDeleteButton.addEventListener('click', () => {
            console.log('Cancel button clicked');
            deleteConfirmModal.classList.remove('active');
            listingToDeleteId = null;
        });
    }

    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', async () => {
            console.log('Confirm Delete button clicked');
            const enteredPassword = deletePasswordInput.value;

            if (enteredPassword === DELETE_PASSWORD) {
                passwordError.style.display = 'none';
                try {
                    if (listingToDeleteId) {
                        await deleteDoc(doc(db, "listings", listingToDeleteId));
                        console.log("Document successfully deleted!");
                        deleteConfirmationForm.style.display = 'none';
                        deleteSuccessMessage.style.display = 'block';
                    }
                } catch (error) {
                    console.error("Error removing document: ", error);
                    passwordError.textContent = "Error deleting listing. Please try again.";
                    passwordError.style.display = 'block';
                }
            } else {
                passwordError.textContent = "Kata sandi salah. Silakan coba lagi.";
                passwordError.style.display = 'block';
            }
        });
    }

    if (closeSuccessMessageButton) {
        closeSuccessMessageButton.addEventListener('click', () => {
            console.log('Close Success Message button clicked');
            deleteConfirmModal.classList.remove('active');
            listingToDeleteId = null;
        });
    }

    setActiveNavLink();
});
