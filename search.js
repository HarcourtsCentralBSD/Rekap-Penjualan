// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

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
const auth = getAuth(app);

// Get projectId from URL
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');

const searchInput = document.getElementById('searchNamaListing');
const searchLoadingIndicator = document.getElementById('searchLoadingIndicator');
const dynamicSectionsContainer = document.getElementById('dynamicSectionsContainer');

const filterTypeButtons = document.querySelectorAll('.filter-type-button');

let listingToDeleteId = null;
const DELETE_PASSWORD = "admin";

let deleteConfirmModal;
let deleteConfirmationForm;
let deletePasswordInput;
let passwordError;
let cancelDeleteButton;
let confirmDeleteButton;
let deleteSuccessMessage;
let closeSuccessMessageButton;

let allFetchedListings = [];
const predefinedStatusOrder = ['free', 'hold', 'naik booking', 'sudah akad', 'batal'];

let currentDisplayType = 'status';

let isAuthReady = false;

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("search.js: Authenticated user for delete operations.");
    } else {
        console.log("search.js: No user, attempting anonymous sign-in for delete operations.");
        signInAnonymously(auth).catch(error => {
            console.error("search.js: Anonymous sign-in failed:", error);
        });
    }
    isAuthReady = true;
});
// Get the main header title element
const mainHeaderTitle = document.getElementById('mainHeaderTitle');

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


function sortBlocks(a, b) {
    const blockA = a.blok || '';
    const blockB = b.blok || '';

    const re = /^([a-zA-Z]+)(\d*)$/;
    const matchA = blockA.match(re);
    const matchB = blockB.match(re);

    if (!matchA || !matchB) {
        return blockA.localeCompare(blockB);
    }

    const lettersA = matchA[1];
    const numbersA = parseInt(matchA[2] || '0', 10);
    const lettersB = matchB[1];
    const numbersB = parseInt(matchB[2] || '0', 10);

    const letterComparison = lettersA.localeCompare(lettersB);
    if (letterComparison !== 0) {
        return letterComparison;
    }

    return numbersA - numbersB;
}


function renderSections(listingsToDisplay) {
    dynamicSectionsContainer.innerHTML = '';

    let categories = [];
    let categoryCounts = {};

    listingsToDisplay.sort(sortBlocks);


    if (currentDisplayType === 'status') {
        categories = predefinedStatusOrder;
        predefinedStatusOrder.forEach(status => categoryCounts[status] = 0);
    } else if (currentDisplayType === 'tipe') {
        const uniqueTipes = new Set();
        listingsToDisplay.forEach(listing => {
            if (listing.tipe && (listing.status ? listing.status.toLowerCase() : 'free') === 'free') {
                uniqueTipes.add(listing.tipe.toLowerCase());
            }
        });
        categories = Array.from(uniqueTipes).sort();
        categories.forEach(tipe => categoryCounts[tipe] = 0);
    }

    listingsToDisplay.forEach(listing => {
        let categoryValue;
        if (currentDisplayType === 'status') {
            categoryValue = (listing.status ? listing.status.toLowerCase() : 'free');
            if (categoryValue === 'naik akad') categoryValue = 'sudah akad';
        } else if (currentDisplayType === 'tipe') {
            if ((listing.status ? listing.status.toLowerCase() : 'free') !== 'free') {
                return;
            }
            categoryValue = (listing.tipe ? listing.tipe.toLowerCase() : 'unknown');
        }

        if (categoryCounts.hasOwnProperty(categoryValue)) {
            categoryCounts[categoryValue]++;
        } else if (currentDisplayType === 'tipe') {
            categoryCounts[categoryValue] = (categoryCounts[categoryValue] || 0) + 1;
            if (!categories.includes(categoryValue)) {
                categories.push(categoryValue);
            }
        }
    });

    if (currentDisplayType === 'tipe') {
        categories.sort();
    }


    categories.forEach(category => {
        const categoryId = category.replace(/\s/g, '-');
        const section = document.createElement('div');
        section.classList.add('status-section');

        const header = document.createElement('div');
        header.classList.add('status-header');
        header.dataset.statusGroup = category;
        header.innerHTML = `
            <h4>${category.charAt(0).toUpperCase() + category.slice(1)} (<span id="count-${categoryId}">${categoryCounts[category] || 0}</span>) <i class="fas fa-chevron-down toggle-arrow"></i></h4>
        `;
        section.appendChild(header);

        const content = document.createElement('div');
        content.classList.add('status-content');
        content.id = `listings-${categoryId}`;
        content.style.display = 'none';
        section.appendChild(content);

        dynamicSectionsContainer.appendChild(section);

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

    listingsToDisplay.forEach(listing => {
        let categoryValue;
        if (currentDisplayType === 'status') {
            categoryValue = (listing.status ? listing.status.toLowerCase() : 'free');
            if (categoryValue === 'naik akad') categoryValue = 'sudah akad';
        } else if (currentDisplayType === 'tipe') {
            if ((listing.status ? listing.status.toLowerCase() : 'free') !== 'free') {
                return;
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
                window.location.href = `update.html?projectId=${projectId}&id=${listing.id}`;
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

                if (!auth.currentUser) {
                    console.warn("User not authenticated. Attempting anonymous sign-in before delete.");
                    signInAnonymously(auth).then(() => {
                        console.log("Anonymous user signed in, proceeding with delete confirmation.");
                        deletePasswordInput.value = '';
                        passwordError.style.display = 'none';
                        deleteConfirmationForm.style.display = 'block';
                        deleteSuccessMessage.style.display = 'none';
                        deleteConfirmModal.classList.add('active');
                    }).catch(error => {
                        console.error("Anonymous sign-in failed, cannot proceed with delete:", error);
                        alert("Gagal mengautentikasi untuk menghapus. Silakan coba lagi.");
                    });
                } else {
                    deletePasswordInput.value = '';
                    passwordError.style.display = 'none';
                    deleteConfirmationForm.style.display = 'block';
                    deleteSuccessMessage.style.display = 'none';
                    deleteConfirmModal.classList.add('active');
                }
            });
        }
    });

    manageSectionVisibilityAndState();
}

function manageSectionVisibilityAndState() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    document.querySelectorAll('.status-section').forEach(section => {
        const header = section.querySelector('.status-header');
        const content = section.querySelector('.status-content');
        const arrow = header.querySelector('.toggle-arrow');
        const countSpan = header.querySelector('span');
        const currentCount = parseInt(countSpan.textContent);

        if (currentCount > 0) {
            section.style.display = 'block';
            if (searchTerm !== '') {
                content.style.display = 'block';
                arrow.classList.remove('fa-chevron-down');
                arrow.classList.add('fa-chevron-up');
            } else {
                content.style.display = 'none';
                arrow.classList.remove('fa-chevron-up');
                arrow.classList.add('fa-chevron-down');
            }
        } else {
            section.style.display = 'none';
        }
    });
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);

    const filteredListings = allFetchedListings.filter(listing => {
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
        return true;
    });

    renderSections(filteredListings);

    if (searchTerm === '') {
        document.querySelectorAll('.status-section').forEach(section => {
            section.style.display = 'block';
            const content = section.querySelector('.status-content');
            const arrow = section.querySelector('.toggle-arrow');
            content.style.display = 'none';
            arrow.classList.remove('fa-chevron-up');
            arrow.classList.add('fa-chevron-down');
        });
    }
}

if (!projectId) {
    if (searchLoadingIndicator) searchLoadingIndicator.style.display = 'none';
    if (dynamicSectionsContainer) dynamicSectionsContainer.innerHTML = '<p style="text-align: center; color: red;">Error: Proyek belum dipilih. Silakan kembali ke halaman utama untuk memilih proyek.</p>';
    if (dynamicSectionsContainer) dynamicSectionsContainer.style.display = 'block';
} else {
    if (searchLoadingIndicator) {
        searchLoadingIndicator.style.display = 'flex';
    }
    if (dynamicSectionsContainer) {
        dynamicSectionsContainer.style.display = 'none';
    }

    onSnapshot(query(collection(db, `projects/${projectId}/listings`)), (snapshot) => {
        allFetchedListings = [];
        snapshot.forEach((doc) => {
            allFetchedListings.push({ id: doc.id, ...doc.data() });
        });
        applyFilters();

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
}


searchInput.addEventListener('input', applyFilters);

filterTypeButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterTypeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentDisplayType = button.dataset.filterDisplayType;
        applyFilters();
    });
});


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
        // Corrected: changed confirmConfirmButton to confirmDeleteButton
        confirmDeleteButton.addEventListener('click', async () => {
            console.log('Confirm Delete button clicked');
            const enteredPassword = deletePasswordInput.value;

            if (enteredPassword === DELETE_PASSWORD) {
                passwordError.style.display = 'none';
                try {
                    if (listingToDeleteId) {
                        await deleteDoc(doc(db, `projects/${projectId}/listings`, listingToDeleteId));
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
