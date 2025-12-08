// EnlistmentPage.js

// --- Global Scope for access ---
let subjects = [];
let enlistedSubjects = [];
let subjectsAlreadyTaken = [];
let studentProfile = {}; // Global profile variable

let currentSearchTerm = '';
let currentDepartmentFilter = 'All departments';
let showOnlyAvailableSlots = false;

// ★ FIX 1: Max Units Map from max_units.php (Assuming 2nd Semester ONLY for simplicity based on provided map)
const MAX_UNITS_MAP = {
    // Note: '2nd' below refers to the semester name ('2nd Semester'), while the inner keys (1, 2, 3, 4) refer to the year level.
    '2nd': { // Second Semester
        1: 16, // First Year, Second Semester
        2: 24, // Second Year, Second Semester
        3: 12, // Third Year, Second Semester
        4: 12, // Fourth Year, Second Semester
    },
    // Add logic for '1st' and 'sum' semesters here if needed, or rely on a server-side max_units.php fetch if possible.
};

function getMaxUnits(yearLevel, semester) {
    // Simplified logic: checks if the semester string contains '2nd', 'Second', or '2'
    const semKey = String(semester).toLowerCase().includes('2') || String(semester).toLowerCase().includes('second') ? '2nd' : '1st';
    const yearKey = parseInt(yearLevel, 10);

    // Default to a safe fallback (e.g., 24, as used in original updateSummary and max_units.php)
    return (MAX_UNITS_MAP[semKey] && MAX_UNITS_MAP[semKey][yearKey]) ? MAX_UNITS_MAP[semKey][yearKey] : 24;
}

function calculateTotalEnlistedUnits(uniqueIdArray) {
    const allSelected = [...new Set([...uniqueIdArray, ...subjectsAlreadyTaken])];

    return allSelected.reduce((acc, uniqueId) => {
        const parts = uniqueId.split('-');
        const subjectCode = parts[0];
        const section = parts[1];

        const sub = subjects.find(s => s.code === subjectCode && String(s.section) === String(section));
        return acc + (sub ? parseInt(sub.units, 10) : 0); // Ensure units are parsed as integer
    }, 0);
}


// --- INITIALIZE (MODIFIED) ---
document.addEventListener("DOMContentLoaded", () => {
    loadProfileAndInitialize();
    fetchEnlistedSubjects();
    applyFilters(true);
    updateSummary();
    setupEventListeners();
});

// --- NEW FUNCTION: Profile Loader & UI State Manager (FIXED) ---
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

            // ★ FIX 2: Determine Max Units and add to profile
            studentProfile.max_units = getMaxUnits(profile.year_level, profile.semester); // Assuming profile.year_level is 1, 2, 3, 4

            // Update UI elements
            document.getElementById('student-name').innerText = profile.first_name + ' ' + profile.last_name;
            document.getElementById('student-program').innerText = profile.program;
            document.getElementById('student-id').innerText = profile.student_id;
            document.getElementById('student-year').innerText = profile.year_level;
            document.getElementById('current-semester').innerText = profile.semester;
            document.getElementById('student-status').innerText = profile.status;

            // ★ FIX 3: Update the summary card with the correct max units on load
            document.getElementById("total-units").innerText = `0/${studentProfile.max_units}`;

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

// --- TOGGLE ENLIST (FIXED) ---
function toggleEnlist(uniqueId, event) {
    if (event && event.target.disabled) {
        return;
    }

    if (subjectsAlreadyTaken.includes(uniqueId)) {
        alert(`Error: Subject ${uniqueId.split('-')[0]} is already enlisted or enrolled.`);
        if (event) event.preventDefault();
        return;
    }

    // ★ FIX 4a: Get max units or fall back
    const maxUnits = studentProfile.max_units || 24;

    if (enlistedSubjects.includes(uniqueId)) {
        enlistedSubjects = enlistedSubjects.filter(id => id !== uniqueId);
    } else {
        const subjectCodeOnly = uniqueId.split('-')[0];
        const isSubjectCodeEnlisted = enlistedSubjects.some(id => id.split('-')[0] === subjectCodeOnly);

        if (isSubjectCodeEnlisted) {
            alert(`You have already enlisted a section of ${subjectCodeOnly}. Please remove it first.`);
            return;
        }

        // Find the subject being added
        const subToAdd = subjects.find(s => s.code + '-' + s.section === uniqueId);
        if (!subToAdd) {
             alert("Error: Could not find subject details.");
             return;
        }

        // Calculate current and future units
        const currentTotalUnits = calculateTotalEnlistedUnits(enlistedSubjects.filter(id => id !== uniqueId)); // Exclude the one being potentially removed (though toggle logic handles that)
        const newTotalUnits = currentTotalUnits + parseInt(subToAdd.units, 10);

        // ★ FIX 4b: Check for Unit Limit BEFORE adding
        if (newTotalUnits > maxUnits) {
            alert(`Cannot enlist. Adding ${subToAdd.code} (${subToAdd.units} units) would exceed the maximum unit limit of ${maxUnits} units for your year level and semester.`);
            return; // STOP enlistment
        }

        enlistedSubjects.push(uniqueId);
    }

    applyFiltersOnClient();
    updateSummary();
}

// --- UPDATE SUMMARY (FIXED) ---
function updateSummary() {
    const totalSubjects = enlistedSubjects.length + subjectsAlreadyTaken.length;

    // ★ FIX 5a: Use determined max units or fallback
    const maxUnits = studentProfile.max_units || 24;

    const totalUnits = calculateTotalEnlistedUnits(enlistedSubjects);

    // ★ FIX 5b: Display and Check against dynamic max units
    const unitsElement = document.getElementById("total-units");
    unitsElement.innerText = `${totalUnits}/${maxUnits}`;

    // Optional: Add styling for error state
    if (totalUnits > maxUnits) {
         unitsElement.classList.add('units-exceeded');
    } else {
         unitsElement.classList.remove('units-exceeded');
    }
    // ★ END FIX

    document.getElementById("total-subjects").innerText = totalSubjects;
}

// --- CLEAR ALL (NO CHANGE) ---
function clearAll() {
    enlistedSubjects = [];
    applyFiltersOnClient();
    updateSummary();
}

// --- SUBMIT ENLISTMENT (FIXED - using studentProfile.max_units) ---
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

    // Re-validate against max units just before submission (Client-side failsafe)
    const totalUnits = calculateTotalEnlistedUnits(enlistedSubjects);
    const maxUnits = studentProfile.max_units || 24;

    if (totalUnits > maxUnits) {
        alert(`CRITICAL ERROR: Total units (${totalUnits}) exceeds the maximum allowed units (${maxUnits}) for your profile. Please adjust your selection before submission.`);
        return;
    }
    // End Re-validation

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
