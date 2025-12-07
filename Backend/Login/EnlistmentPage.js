// --- Global Scope for access ---
let subjects = []; // All subjects from the database
let enlistedSubjects = []; // Stores UNIQUE IDs of selected subjects (e.g., 'ICC 0101-1')

let currentSearchTerm = '';
let currentDepartmentFilter = 'All departments';
let showOnlyAvailableSlots = false;

// CRITICAL: Empty array for fresh enlistment (no mock data)
const subjectsAlreadyTaken = [];


// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", () => {
    fetchStudentProfile();
    fetchSubjects();
    updateSummary();
    setupEventListeners();
});


// --- 1. STUDENT PROFILE (Working) ---
async function fetchStudentProfile() {
    const studentNameEl = document.getElementById('student-name');
    const studentProgramEl = document.getElementById('student-program');
    const studentIdEl = document.getElementById('student-id');
    const studentYearEl = document.getElementById('student-year');
    const currentSemesterEl = document.getElementById('current-semester');
    const studentStatusEl = document.getElementById('student-status');

    const loggedInStudentId = localStorage.getItem('plm_student_name');

    if (!loggedInStudentId) {
        studentNameEl.innerText = 'Login Required';
        studentStatusEl.innerText = 'Redirecting...';
        return;
    }

    [studentNameEl, studentProgramEl, studentIdEl, studentYearEl, currentSemesterEl, studentStatusEl]
        .forEach(el => el.innerText = 'Loading...');

    try {
        const response = await fetch(`student_profile.php?student_id=${loggedInStudentId}`);
        const data = await response.json();

        if (data.success) {
            studentNameEl.innerText = data.full_name;
            studentProgramEl.innerText = data.program;
            studentIdEl.innerText = data.student_id;
            studentYearEl.innerText = data.year_level;
            currentSemesterEl.innerText = data.semester_sy;

            studentStatusEl.innerText = data.status;
            studentStatusEl.classList.add('status-tag');
        } else {
            console.error("Failed to fetch student profile:", data.message);
            studentNameEl.innerText = `Error: ${data.message}`;
            studentIdEl.innerText = loggedInStudentId;
        }
    } catch (error) {
        console.error("Network or parsing error fetching profile:", error);
        studentNameEl.innerText = 'Network Error';
    }
}


// --- 2. FETCH SUBJECTS (Server-Side Filter Integration) ---
async function fetchSubjects() {
    // 1. Map the UI filter name to the internal database course code (BSIT, BSCS, etc.)
    const departmentToCourseMap = {
        'All departments': 'ALL',
        'Information Technology': 'BSIT',
        'Computer Science': 'BSCS'
    };
    const filterValue = departmentToCourseMap[currentDepartmentFilter] || 'ALL';

    // 2. Build the URL with the filter parameter
    const url = `enlistment.php?course_filter=${filterValue}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            subjects = data.subjects;
            // IMPORTANT: Now we call the client-side filter to apply Search/Slots/Taken status
            applyFiltersOnClient();
        } else {
            console.error("Failed to fetch subjects:", data.message);
            const container = document.getElementById("subject-list");
            container.innerHTML = `<p class="subtitle">Error loading subjects: ${data.message}</p>`;
        }
    } catch (error) {
        console.error("Network or parsing error:", error);
        const container = document.getElementById("subject-list");
        container.innerHTML = `<p class="subtitle">A network error occurred while fetching subjects.</p>`;
    }
}

// --- 3. SEARCH AND FILTER LOGIC (Client-Side Filtering) ---
function applyFiltersOnClient() {
    let filteredList = subjects;

    // Apply Search Term Filter
    if (currentSearchTerm) {
        const lowerSearchTerm = currentSearchTerm.toLowerCase();
        filteredList = filteredList.filter(sub => {
            const codeMatch = sub.code.toLowerCase().includes(lowerSearchTerm);
            const descMatch = sub.description.toLowerCase().includes(lowerSearchTerm);
            return codeMatch || descMatch;
        });
    }

    // Apply Available Slots Filter (Simulated)
    if (showOnlyAvailableSlots) {
        filteredList = filteredList.filter(sub => {
            const parts = sub.slots.split('/');
            const currentSlots = parseInt(parts[0], 10);
            return currentSlots > 0;
        });
    }

    // IMPORTANT: We render the filtered list. 'Taken' status is handled visually in renderSubjects.
    renderSubjects(filteredList);
}

// --- 4. RENDER SUBJECTS (Updated to show visual warnings) ---
function renderSubjects(list = subjects) {
    const container = document.getElementById("subject-list");
    document.getElementById("subject-count").innerText = list.length;

    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `<p class="subtitle">No subjects found matching the current search and filters.</p>`;
        return;
    }

    list.forEach(sub => {
        const uniqueId = sub.code + '-' + sub.section;
        const isEnlisted = enlistedSubjects.includes(uniqueId);
        const subjectCodeOnly = sub.code;

        const scheduleLine = sub.schedule;
        const facultyLine = sub.faculty && sub.faculty !== ', ' ? `| Instructor: ${sub.faculty}` : '';
        const slotsLine = `Slots: ${sub.slots} | Room: ${sub.room}`;

        // Determine statuses and messages
        const isSubjectCodeEnlisted = enlistedSubjects.some(id => id.split('-')[0] === subjectCodeOnly);
        const isAlreadyTaken = subjectsAlreadyTaken.includes(subjectCodeOnly);

        let isDisabled = false;
        let warningMessage = '';
        let cardClass = '';

        if (isAlreadyTaken) {
            // Priority 1: Already Taken
            isDisabled = true;
            warningMessage = '⚠️ Subject already taken/credited.';
            cardClass = 'taken-subject';
        } else if (isSubjectCodeEnlisted && !isEnlisted) {
            // Priority 2: Another section is already enlisted (Conflict)
            isDisabled = true;
            const enlistedSection = enlistedSubjects.find(id => id.startsWith(subjectCodeOnly + '-')).split('-')[1];
            warningMessage = `⚠️ Cannot enlist. Section ${enlistedSection} is already selected.`;
            cardClass = 'disabled-card';
        }

        const buttonText = isEnlisted ? '✓ Enlisted' : 'Enlist';

        const card = document.createElement("div");
        card.className = `subject-card ${cardClass}`;

        card.innerHTML = `
            <div class="subject-info">
                <h4>${sub.code} (${sub.units} units) - Section ${sub.section}</h4>
                <p class="subject-desc">${sub.description}</p>
                <div class="subject-meta">
                    <span>🕒 Schedule: ${scheduleLine} ${facultyLine}</span>
                    <span>${slotsLine}</span>
                    ${warningMessage ? `<p class="subject-warning">${warningMessage}</p>` : ''}
                </div>
            </div>
            <button
                class="btn-enlist ${isEnlisted ? 'enlisted' : ''}"
                onclick="toggleEnlist('${uniqueId}', event)"
                ${isDisabled ? 'disabled' : ''}>
                ${buttonText}
            </button>
        `;

        container.appendChild(card);
    });
}


// --- 5. ACTIONS (Enlist/Unenlist) ---
function toggleEnlist(uniqueId, event) {
    const subjectCodeOnly = uniqueId.split('-')[0];

    if (subjectsAlreadyTaken.includes(subjectCodeOnly)) {
        alert(`Error: ${subjectCodeOnly} is already taken or credited.`);
        if(event) event.preventDefault();
        return;
    }

    if (event && event.target.disabled) {
        return;
    }

    if (enlistedSubjects.includes(uniqueId)) {
        // UNENLIST: Always allowed
        enlistedSubjects = enlistedSubjects.filter(id => id !== uniqueId);
    } else {
        // ENLIST: Check for subject code conflict
        const isSubjectCodeEnlisted = enlistedSubjects.some(id => id.split('-')[0] === subjectCodeOnly);

        if (isSubjectCodeEnlisted) {
            alert(`You have already enlisted a section of ${subjectCodeOnly}. Please remove it first.`);
            return;
        }

        // Proceed with enlistment
        enlistedSubjects.push(uniqueId);
    }

    applyFiltersOnClient(); // Use client filter since the data is already fetched
    updateSummary();
}


// --- 6. SUMMARY & SUBMISSION (Existing Code) ---

function updateSummary() {
    const totalSubjects = enlistedSubjects.length;

    const totalUnits = enlistedSubjects.reduce((acc, uniqueId) => {
        const parts = uniqueId.split('-');
        const subjectCode = parts[0];
        const section = parseInt(parts[1]);

        const sub = subjects.find(s => s.code === subjectCode && s.section == section);

        return acc + (sub ? sub.units : 0);
    }, 0);

    document.getElementById("total-units").innerText = `${totalUnits}/24`;
    document.getElementById("total-subjects").innerText = totalSubjects;
}

function clearAll() {
    enlistedSubjects = [];
    applyFiltersOnClient(); // Use client filter
    updateSummary();
}

function submitEnlistment() {
    if (enlistedSubjects.length === 0) {
        alert("Please enlist at least one subject before submitting.");
        return;
    }

    const finalSelection = subjects.filter(sub => {
        const uniqueId = sub.code + '-' + sub.section;
        return enlistedSubjects.includes(uniqueId);
    });

    const registrationData = {
        student: {
            name: document.getElementById('student-name').innerText,
            id: document.getElementById('student-id').innerText,
            program: document.getElementById('student-program').innerText,
            year: document.getElementById('student-year').innerText
        },
        subjects: finalSelection,
        date: new Date().toLocaleDateString()
    };

    localStorage.setItem("PLM_Enlistment_Data", JSON.stringify(registrationData));

    alert("Enlistment successful! Preparing registration form for printing.");
    window.open("RegistrationForm.html", "_blank");
}


// --- 7. EVENT LISTENERS & DROPDOWN (Updated to call correct filter functions) ---

function setupEventListeners() {
    // Search Bar Listener: Calls client filter
    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        applyFiltersOnClient();
    });

    // Checkbox Listener: Calls client filter
    document.getElementById('slots').addEventListener('change', (e) => {
        showOnlyAvailableSlots = e.target.checked;
        applyFiltersOnClient();
    });

    // Reset Filters Button Listener: Calls full fetch
    document.querySelector('.sidebar-right .btn-secondary').addEventListener('click', (e) => {
        e.preventDefault();

        currentSearchTerm = '';
        currentDepartmentFilter = 'All departments';
        showOnlyAvailableSlots = false;

        document.getElementById('searchInput').value = '';
        document.getElementById('selected-text').innerText = 'All departments';
        document.getElementById('slots').checked = false;

        applyFilters(); // Triggers re-fetch from server (All departments)
    });
}

// Dropdown change: Calls full fetch
function selectOption(value) {
    document.getElementById("selected-text").innerText = value;
    document.getElementById("dropdown-options").classList.remove("show");

    currentDepartmentFilter = value;
    applyFilters(); // Triggers re-fetch from server with new filter
}

function toggleDropdown() {
    const options = document.getElementById("dropdown-options");
    options.classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.closest('.custom-dropdown')) {
        const dropdowns = document.getElementsByClassName("dropdown-options");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

// --- 8. SCROLL SHADOW LOGIC (Existing Code) ---
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});
