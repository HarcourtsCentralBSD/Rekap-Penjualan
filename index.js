// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, query, where, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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

const projectsContainer = document.getElementById('projectsContainer');
const addNewProjectButton = document.getElementById('addNewProjectButton');
const addProjectModal = document.getElementById('addProjectModal');
const newProjectNameInput = document.getElementById('newProjectName');
const addProjectError = document.getElementById('addProjectError');
const cancelAddProjectButton = document.getElementById('cancelAddProjectButton');
const confirmAddProjectButton = document.getElementById('confirmAddProjectButton');

const successModal = document.getElementById('successModal');
const modalMessage = document.getElementById('modalMessage');
const closeSuccessModalButton = document.getElementById('closeSuccessModalButton');

// Delete Project Confirmation Modal elements
const deleteProjectConfirmModal = document.getElementById('deleteProjectConfirmModal');
const projectToDeleteNameSpan = document.getElementById('projectToDeleteName');
const deleteProjectPasswordInput = document.getElementById('deleteProjectPasswordInput');
const deleteProjectPasswordError = document.getElementById('deleteProjectPasswordError');
const cancelDeleteProjectButton = document.getElementById('cancelDeleteProjectButton');
const confirmDeleteProjectButton = document.getElementById('confirmDeleteProjectButton');
const deleteProjectSuccessMessage = document.getElementById('deleteProjectSuccessMessage');
const closeDeleteProjectSuccessButton = document.getElementById('closeDeleteProjectSuccessButton');

const ADMIN_PASSWORD = "admin"; // Admin password for project deletion

let projectToDeleteId = null; // Store ID of project to be deleted

// Function to show generic success/error modal
function showModal(message, isSuccess = true, redirectUrl = null) {
    modalMessage.textContent = message;
    const icon = successModal.querySelector('.success-icon');
    if (isSuccess) {
        icon.classList.remove('fa-times-circle');
        icon.classList.add('fa-check-circle');
        icon.style.color = '#28a745';
    } else {
        icon.classList.remove('fa-check-circle');
        icon.classList.add('fa-times-circle');
        icon.style.color = '#dc3545';
    }
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

// Function to render project buttons
function renderProjectButtons(projects) {
    projectsContainer.innerHTML = '';
    if (projects.length === 0) {
        projectsContainer.innerHTML = '<p>Tidak ada proyek ditemukan. Tambahkan yang baru!</p>';
        return;
    }

    projects.forEach(project => {
        const projectItemDiv = document.createElement('div');
        projectItemDiv.classList.add('project-item'); // New div to wrap button and delete icon

        const projectButton = document.createElement('button');
        projectButton.classList.add('project-button');
        projectButton.textContent = project.name;
        projectButton.dataset.projectId = project.id;

        projectButton.addEventListener('click', () => {
            // Redirect to form.html with project ID
            window.location.href = `form.html?projectId=${project.id}`;
        });
        projectItemDiv.appendChild(projectButton);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button', 'project-delete-button'); // Added project-delete-button class
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.dataset.projectId = project.id;
        deleteButton.dataset.projectName = project.name; // Store project name for modal

        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent project button click
            projectToDeleteId = event.currentTarget.dataset.projectId;
            projectToDeleteNameSpan.textContent = event.currentTarget.dataset.projectName; // Set name in modal

            deleteProjectPasswordInput.value = ''; // Clear password input
            deleteProjectPasswordError.style.display = 'none'; // Hide error
            deleteProjectConfirmationForm.style.display = 'block'; // Show confirmation form
            deleteProjectSuccessMessage.style.display = 'none'; // Hide success message
            deleteProjectConfirmModal.classList.add('active'); // Show modal
        });
        projectItemDiv.appendChild(deleteButton);

        projectsContainer.appendChild(projectItemDiv);
    });
}

// Listen for real-time updates to the 'projects' collection
onSnapshot(collection(db, "projects"), (snapshot) => {
    const projects = [];
    snapshot.forEach((doc) => {
        projects.push({ id: doc.id, ...doc.data() });
    });
    renderProjectButtons(projects);
}, (error) => {
    console.error("Error fetching projects:", error);
    projectsContainer.innerHTML = '<p>Error memuat daftar proyek. Silakan coba lagi.</p>';
});

// Add New Project Button Click
addNewProjectButton.addEventListener('click', () => {
    newProjectNameInput.value = ''; // Clear input
    addProjectError.style.display = 'none'; // Hide error
    addProjectModal.classList.add('active'); // Show modal
});

// Cancel Add Project
cancelAddProjectButton.addEventListener('click', () => {
    addProjectModal.classList.remove('active');
});

// Confirm Add Project
confirmAddProjectButton.addEventListener('click', async () => {
    const projectName = newProjectNameInput.value.trim();
    if (!projectName) {
        addProjectError.textContent = "Nama proyek tidak boleh kosong.";
        addProjectError.style.display = 'block';
        return;
    }

    // Check for duplicate project name (case-insensitive)
    try {
        const projectsRef = collection(db, 'projects');
        const allProjectsSnapshot = await getDocs(projectsRef); // Fetch all projects

        let isDuplicate = false;
        const newProjectNameLower = projectName.toLowerCase();

        allProjectsSnapshot.forEach(doc => {
            const existingProjectName = doc.data().name;
            if (existingProjectName && existingProjectName.toLowerCase() === newProjectNameLower) {
                isDuplicate = true;
            }
        });

        if (isDuplicate) {
            addProjectError.textContent = "Nama proyek sudah ada.";
            addProjectError.style.display = 'block';
            return;
        }
    } catch (duplicateCheckError) {
        console.error("Error checking for duplicate project name:", duplicateCheckError);
        addProjectError.textContent = "Terjadi kesalahan saat memeriksa nama proyek.";
        addProjectError.style.display = 'block';
        return;
    }


    try {
        // Add new project document to 'projects' collection
        await addDoc(collection(db, "projects"), {
            name: projectName,
            createdAt: new Date()
        });
        addProjectModal.classList.remove('active');
        showModal('Proyek berhasil ditambahkan!', true);
    } catch (error) {
        console.error("Error adding project:", error);
        addProjectError.textContent = "Gagal menambahkan proyek. Silakan coba lagi.";
        addProjectError.style.display = 'block';
    }
});

// Close modal if clicked outside
window.addEventListener('click', (event) => {
    if (event.target === addProjectModal) {
        addProjectModal.classList.remove('active');
    }
    // Also close delete modal if clicked outside
    if (event.target === deleteProjectConfirmModal) {
        deleteProjectConfirmModal.classList.remove('active');
    }
});

// Delete Project Modal - Cancel Button
cancelDeleteProjectButton.addEventListener('click', () => {
    deleteProjectConfirmModal.classList.remove('active');
    projectToDeleteId = null;
});

// Delete Project Modal - Confirm Delete Button
confirmDeleteProjectButton.addEventListener('click', async () => {
    const enteredPassword = deleteProjectPasswordInput.value;
    if (enteredPassword === ADMIN_PASSWORD) {
        deleteProjectPasswordError.style.display = 'none';
        try {
            if (projectToDeleteId) {
                // Delete the project document itself
                await deleteDoc(doc(db, "projects", projectToDeleteId));

                // Optional: Delete all subcollection documents (listings)
                // This is more complex and requires fetching all listings first
                // For simplicity, Firestore rules might handle this if you set them up
                // to cascade deletes, or you might need a Cloud Function for large scale deletes.
                // For this client-side app, we'll just delete the project document.
                // If you want to delete subcollections, you'd need to fetch them and delete individually:
                // const listingsRef = collection(db, `projects/${projectToDeleteId}/listings`);
                // const listingsSnapshot = await getDocs(listingsRef);
                // const batch = db.batch();
                // listingsSnapshot.forEach(listingDoc => {
                //     batch.delete(listingDoc.ref);
                // });
                // await batch.commit();

                console.log("Project successfully deleted:", projectToDeleteId);
                deleteProjectConfirmationForm.style.display = 'none';
                deleteProjectSuccessMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Error deleting project:", error);
            deleteProjectPasswordError.textContent = "Error menghapus proyek. Silakan coba lagi.";
            deleteProjectPasswordError.style.display = 'block';
        }
    } else {
        deleteProjectPasswordError.textContent = "Kata sandi salah. Silakan coba lagi.";
        deleteProjectPasswordError.style.display = 'block';
    }
});

// Delete Project Modal - Close Success Button
closeDeleteProjectSuccessButton.addEventListener('click', () => {
    deleteProjectConfirmModal.classList.remove('active');
    projectToDeleteId = null;
});


// Initial active nav link (for the 'Proyek' link itself)
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.main-nav .nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === 'index.html') {
            link.classList.add('active');
        }
    });
});
