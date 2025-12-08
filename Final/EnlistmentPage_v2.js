// EnlistmentPage.js

// --- Global Scope for access ---
let subjects = [];
let enlistedSubjects = [];
let subjectsAlreadyTaken = [];
let studentProfile = {}; // Global profile variable

let currentSearchTerm = '';
let currentDepartmentFilter = 'All departments';
let showOnlyAvailableSlots = false;

// --- INITIALIZE (MODIFIED) ---
document.addEventListener("DOMContentLoaded", () => {
    loadProfileAndInitialize();
    fetchEnlistedSubjects();
    applyFilters(true);
    updateSummary();
    setupEventListeners();
});

// --- NEW FUNCTION: Profile Loader & UI State Manager ---
async function loadProfileAndInitialize() {
    const submitBtn = document.querySelector('.summary-card .btn-primary');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading Profile...';
    }

    try {
        const response = await fetch('get_student_data.php');
        const data = await response.json();

        if (data.success && data.data) {
            const profile = data.data;
            studentProfile = profile;

            // Update UI elements
            document.getElementById('student-name').innerText = profile.first_name + ' ' + profile.last_name;
            document.getElementById('student-program').innerText = profile.program;
            document.getElementById('student-id').innerText = profile.student_id;
            document.getElementById('student-year').innerText = profile.year_level;
            document.getElementById('current-semester').innerText = profile.semester;
            document.getElementById('student-status').innerText = profile.status;

            // SUCCESS: Enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }

        } else {
            console.error('Failed to load student profile:', data.message);
            if (submitBtn) {
                submitBtn.textContent = 'Profile Load Failed';
            }
        }
    } catch (error) {
        console.error('Error fetching student profile:', error);
        if (submitBtn) {
            submitBtn.textContent = 'Connection Error';
        }
    }
}


// --- Fetch enlisted/enrolled subjects from server (NO CHANGE) ---
async function fetchEnlistedSubjects() {
    try {
        const response = await fetch('get_enlisted_subjects.php');
        const data = await response.json();
        if (data.success) {
            subjectsAlreadyTaken = data.enlistedSubjects || [];
            applyFiltersOnClient();
        } else {
            console.warn("Could not fetch enlisted subjects: " + data.message);
        }
    } catch (error) {
        console.error("Error fetching enlisted subjects:", error);
    }
}

// --- FETCH SUBJECTS (NO CHANGE) ---
async function fetchSubjects() {
    const departmentToCourseMap = {
        'All departments': 'ALL',
        'Information Technology': 'BSIT',
        'Computer Science': 'BSCS'
    };
    const filterValue = departmentToCourseMap[currentDepartmentFilter] || 'ALL';
    const url = `enlistment.php?course_filter=${filterValue}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
            subjects = data.subjects;
            applyFiltersOnClient();
        } else {
            console.error("Failed to fetch subjects:", data.message);
            document.getElementById("subject-list").innerHTML = `<p class="subtitle">Error loading subjects: ${data.message}</p>`;
        }
    } catch (error) {
        console.error("Network or parsing error:", error);
        document.getElementById("subject-list").innerHTML = `<p class="subtitle">A network error occurred while fetching subjects.</p>`;
    }
}

// --- APPLY FILTERS CONTROLLER & CLIENT-SIDE (NO CHANGE) ---
function applyFilters(shouldRefetch = false) {
    if (shouldRefetch) {
        fetchSubjects();
    } else {
        applyFiltersOnClient();
    }
}

function applyFiltersOnClient() {
    let filteredList = subjects;

    if (currentSearchTerm) {
        const lowerSearchTerm = currentSearchTerm.toLowerCase();
        filteredList = filteredList.filter(sub => {
            return sub.code.toLowerCase().includes(lowerSearchTerm) || sub.description.toLowerCase().includes(lowerSearchTerm);
        });
    }

    if (showOnlyAvailableSlots) {
        filteredList = filteredList.filter(sub => {
            const parts = sub.slots.split('/');
            const currentSlots = parseInt(parts[0], 10);
            return currentSlots > 0;
        });
    }

    renderSubjects(filteredList);
}

// --- RENDER SUBJECTS (NO CHANGE) ---
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
        const isAlreadyTaken = subjectsAlreadyTaken.includes(uniqueId);

        let isDisabled = false;
        let warningMessage = '';
        let cardClass = '';

        if (isAlreadyTaken) {
            isDisabled = true;
            warningMessage = '⚠️ Already enlisted or enrolled.';
            cardClass = 'taken-subject';
        } else if (enlistedSubjects.some(id => id.split('-')[0] === sub.code) && !isEnlisted) {
            // Conflict: another section already selected
            isDisabled = true;
            const enlistedSection = enlistedSubjects.find(id => id.startsWith(sub.code + '-')).split('-')[1];
            warningMessage = `⚠️ Cannot enlist. Section ${enlistedSection} is already selected.`;
            cardClass = 'disabled-card';
        }

        const buttonText = isAlreadyTaken ? 'Already Enlisted' : (isEnlisted ? '✓ Enlisted' : 'Enlist');

        const card = document.createElement("div");
        card.className = `subject-card ${cardClass}`;

        // Create inner HTML except button first
        card.innerHTML = `
            <div class="subject-info">
                <h4>${sub.code} (${sub.units} units) - Section ${sub.section}</h4>
                <p class="subject-desc">${sub.description}</p>
                <div class="subject-meta">
                    <span>🕒 Schedule: ${sub.schedule} ${sub.faculty && sub.faculty !== ', ' ? '| Instructor: ' + sub.faculty : ''}</span>
                    <span>Slots: ${sub.slots} | Room: ${sub.room}</span>
                    ${warningMessage ? `<p class="subject-warning">${warningMessage}</p>` : ''}
                </div>
            </div>
        `;

        // Create button element separately
        const btn = document.createElement("button");
        btn.className = `btn-enlist ${isEnlisted ? 'enlisted' : ''}`;
        btn.disabled = isDisabled;
        btn.textContent = buttonText;

        // Attach click event listener safely
        btn.addEventListener('click', (event) => {
            toggleEnlist(uniqueId, event);
        });

        // Append button to card
        card.appendChild(btn);

        // Append card to container
        container.appendChild(card);

    });
}

// --- TOGGLE ENLIST (NO CHANGE) ---
function toggleEnlist(uniqueId, event) {
    if (event && event.target.disabled) {
        return;
    }

    if (subjectsAlreadyTaken.includes(uniqueId)) {
        alert(`Error: Subject ${uniqueId.split('-')[0]} is already enlisted or enrolled.`);
        if (event) event.preventDefault();
        return;
    }

    if (enlistedSubjects.includes(uniqueId)) {
        enlistedSubjects = enlistedSubjects.filter(id => id !== uniqueId);
    } else {
        const subjectCodeOnly = uniqueId.split('-')[0];
        const isSubjectCodeEnlisted = enlistedSubjects.some(id => id.split('-')[0] === subjectCodeOnly);

        if (isSubjectCodeEnlisted) {
            alert(`You have already enlisted a section of ${subjectCodeOnly}. Please remove it first.`);
            return;
        }

        enlistedSubjects.push(uniqueId);
    }

    applyFiltersOnClient();
    updateSummary();
}

// --- UPDATE SUMMARY (NO CHANGE) ---
function updateSummary() {
    const totalSubjects = enlistedSubjects.length + subjectsAlreadyTaken.length;

    const allSelected = [...new Set([...enlistedSubjects, ...subjectsAlreadyTaken])];

    const totalUnits = allSelected.reduce((acc, uniqueId) => {
        const parts = uniqueId.split('-');
        const subjectCode = parts[0];
        const section = parts[1];

        const sub = subjects.find(s => s.code === subjectCode && String(s.section) === String(section));
        return acc + (sub ? sub.units : 0);
    }, 0);

    document.getElementById("total-units").innerText = `${totalUnits}/24`;
    document.getElementById("total-subjects").innerText = totalSubjects;
}

// --- CLEAR ALL (NO CHANGE) ---
function clearAll() {
    enlistedSubjects = [];
    applyFiltersOnClient();
    updateSummary();
}

// --- SUBMIT ENLISTMENT (FIXED) ---
async function submitEnlistment() {

    // Safety check using button state
    const submitBtn = document.querySelector('.summary-card .btn-primary');
    if (submitBtn && submitBtn.disabled) {
         alert("Please wait for your student profile data to finish loading before submitting.");
         return;
    }

    if (enlistedSubjects.length === 0 && subjectsAlreadyTaken.length === 0) {
        alert("Please enlist at least one subject before submitting.");
        return;
    }

    // ★ CRITICAL FIX: Get final student ID from global variable or localStorage fallback
    const finalStudentId = studentProfile.student_id || localStorage.getItem('PLM_Student_ID');

    if (!finalStudentId) {
        alert("CRITICAL ERROR: Failed to retrieve Student ID for submission/redirect. Please re-login.");
        return;
    }


    const allEnlistedUnique = [...new Set([...enlistedSubjects, ...subjectsAlreadyTaken])];

    const finalSelection = subjects.filter(sub => {
        const uniqueId = sub.code + '-' + sub.section;
        return allEnlistedUnique.includes(uniqueId);
    });

    const serverData = { subjects: finalSelection };

    try {
        const response = await fetch('submit_enlistment.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP Error ${response.status}:`, errorText);
            throw new Error(`Server returned HTTP ${response.status}. Check console for details.`);
        }

        const data = await response.json();

        // In EnlistmentPage.js, inside the submitEnlistment() function's data.success block

        if (data.success) {

            // Map the global studentProfile properties to what RegistrationForm.html expects
            const mappedStudent = {
                id: finalStudentId,
                name: `${studentProfile.first_name} ${studentProfile.last_name}`,
                program: studentProfile.program,
                status: studentProfile.status,
                year: studentProfile.year_level
            };

            const registrationData = {
                student: mappedStudent, // Use the correctly mapped object
                subjects: finalSelection,
                date: new Date().toLocaleDateString()
            };

            console.log("Saving enlistment data to localStorage:", registrationData);
            // CRITICAL WRITE OPERATION
            localStorage.setItem("PLM_Enlistment_Data", JSON.stringify(registrationData));

            // ★ NEW DEBUGGING CHECK
            const checkData = localStorage.getItem("PLM_Enlistment_Data");
            if (!checkData) {
                alert("CRITICAL: Failed to write data to browser storage. Check browser settings.");
                console.error("Local Storage write failed: PLM_Enlistment_Data is null after setItem.");
                return; // Stop redirection if write failed
            }

            alert(data.message + " Preparing registration form for printing.");

            // Use the guaranteed ID for the redirect URL
            window.open(`RegistrationForm.html?studentId=${encodeURIComponent(finalStudentId)}`, "_blank");
        } else {
            alert("Enlistment Failed: " + data.message);
        }
    } catch (error) {
        console.error("Submission error:", error);
        alert(`Submission Failed. Reason: ${error.message}. Please check the console and network tab.`);
    }
}


// --- EVENT LISTENERS (NO CHANGE) ---
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        applyFilters(false);
    });

    document.getElementById('slots').addEventListener('change', (e) => {
        showOnlyAvailableSlots = e.target.checked;
        applyFilters(false);
    });

    document.querySelector('.sidebar-right .btn-secondary').addEventListener('click', (e) => {
        e.preventDefault();
        currentSearchTerm = '';
        currentDepartmentFilter = 'All departments';
        showOnlyAvailableSlots = false;

        document.getElementById('searchInput').value = '';
        document.getElementById('selected-text').innerText = 'All departments';
        document.getElementById('slots').checked = false;

        applyFilters(true);
    });
}

// --- DROPDOWN HANDLERS (NO CHANGE) ---
function selectOption(value) {
    document.getElementById("selected-text").innerText = value;
    document.getElementById("dropdown-options").classList.remove("show");
    currentDepartmentFilter = value;
    applyFilters(true);
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

// --- SCROLL SHADOW (NO CHANGE) ---
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});