// EnlistmentPage.js - FIXED VERSION

// --- Global Scope for access ---
let subjects = [];
let enlistedSubjects = [];
let subjectsAlreadyTaken = [];
let studentProfile = {};

let currentSearchTerm = '';
let currentDepartmentFilter = 'All departments';
let showOnlyAvailableSlots = false;

// --- Helper: Standardize Subject ID Format ---
function getUniqueSubjectId(subjectCode, section) {
    if (!subjectCode || !section) return null;
    return subjectCode.trim().toUpperCase() + '-' + String(section).trim();
}

// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", () => {
    loadProfileAndInitialize();
    fetchEnlistedSubjects();
    applyFilters(true);
    // updateSummary() will be called after subjects load
    setupEventListeners();
});

// --- Profile Loader & UI State Manager ---
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

            document.getElementById('student-name').innerText = profile.first_name + ' ' + profile.last_name;
            document.getElementById('student-program').innerText = profile.program;
            document.getElementById('student-id').innerText = profile.student_id;
            document.getElementById('student-year').innerText = profile.year_level;
            document.getElementById('current-semester').innerText = profile.semester;
            document.getElementById('student-status').innerText = profile.status;

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

// --- Fetch enlisted/enrolled subjects from server ---
async function fetchEnlistedSubjects() {
    try {
        const response = await fetch('get_enlisted_subjects.php');
        const data = await response.json();
        if (data.success) {
            subjectsAlreadyTaken = (data.enlistedSubjects || []).map(id => {
                const parts = id.split('-');
                if (parts.length === 2) {
                    return getUniqueSubjectId(parts[0], parts[1]);
                }
                return null;
            }).filter(id => id !== null);

            console.log("Subjects already taken:", subjectsAlreadyTaken);

            // Only update UI if subjects are already loaded
            if (subjects.length > 0) {
                applyFiltersOnClient();
                updateSummary();
            }
        } else {
            console.warn("Could not fetch enlisted subjects: " + data.message);
        }
    } catch (error) {
        console.error("Error fetching enlisted subjects:", error);
    }
}

// --- FETCH SUBJECTS ---
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
            updateSummary(); // Update summary after subjects are loaded
        } else {
            console.error("Failed to fetch subjects:", data.message);
            document.getElementById("subject-list").innerHTML = `<p class="subtitle">Error loading subjects: ${data.message}</p>`;
        }
    } catch (error) {
        console.error("Network or parsing error:", error);
        document.getElementById("subject-list").innerHTML = `<p class="subtitle">A network error occurred while fetching subjects.</p>`;
    }
}

// --- APPLY FILTERS ---
function applyFilters(shouldRefetch = false) {
    if (shouldRefetch) {
        fetchSubjects();
    } else {
        applyFiltersOnClient();
    }
}

function applyFiltersOnClient() {
    let filteredList = subjects;

    filteredList = filteredList.filter(sub => {
        const uniqueId = getUniqueSubjectId(sub.code, sub.section);
        if (!uniqueId) return false;

        // Always show enlisted/taken subjects
        if (enlistedSubjects.includes(uniqueId) || subjectsAlreadyTaken.includes(uniqueId)) {
            return true;
        }

        // Search Filter
        if (currentSearchTerm) {
            const lowerSearchTerm = currentSearchTerm.toLowerCase();
            const passesSearch = sub.code.toLowerCase().includes(lowerSearchTerm) ||
                                sub.description.toLowerCase().includes(lowerSearchTerm);
            if (!passesSearch) return false;
        }

        // Available Slots Filter
        if (showOnlyAvailableSlots) {
            const parts = sub.slots.split('/');
            const currentSlots = parseInt(parts[0], 10);
            if (currentSlots <= 0) return false;
        }

        return true;
    });

    renderSubjects(filteredList);
}

// --- RENDER SUBJECTS ---
function renderSubjects(list = subjects) {
    const container = document.getElementById("subject-list");
    document.getElementById("subject-count").innerText = list.length;
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `<p class="subtitle">No subjects found matching the current search and filters.</p>`;
        return;
    }

    list.forEach(sub => {
        const uniqueId = getUniqueSubjectId(sub.code, sub.section);
        if (!uniqueId) return;

        const isEnlisted = enlistedSubjects.includes(uniqueId);
        const isAlreadyTaken = subjectsAlreadyTaken.includes(uniqueId);

        let isDisabled = false;
        let warningMessage = '';
        let cardClass = '';

        if (isAlreadyTaken) {
            isDisabled = true;
            warningMessage = '⚠️ Already enlisted or enrolled.';
            cardClass = 'taken-subject';
        } else {
            const subjectCodeOnly = sub.code.trim().toUpperCase();
            const allActiveSubjects = [...enlistedSubjects, ...subjectsAlreadyTaken];

            // Check if another section of same subject is already selected
            const enlistedOtherSectionId = allActiveSubjects.find(id => {
                const parts = id.split('-');
                if (parts.length === 2) {
                    return parts[0].trim().toUpperCase() === subjectCodeOnly && id !== uniqueId;
                }
                return false;
            });

            if (enlistedOtherSectionId) {
                isDisabled = true;
                const enlistedSection = enlistedOtherSectionId.split('-')[1];
                warningMessage = `⚠️ Cannot enlist. Section ${enlistedSection} is already selected or taken.`;
                cardClass = 'disabled-card';
            } else {
                // Check for schedule conflicts (check against ALL active subjects)
                const allActiveSubjects = [...enlistedSubjects, ...subjectsAlreadyTaken];
                const conflict = checkConflict(sub.code, sub.section, subjects, allActiveSubjects);

                if (conflict) {
                    isDisabled = true;
                    warningMessage = `❌ Schedule conflict with ${conflict.existingSubject} on ${conflict.conflictDay}.`;
                    cardClass = 'conflict-subject';
                }
            }
        }

        const buttonText = isAlreadyTaken ? 'Already Enlisted' : (isEnlisted ? '✓ Enlisted' : 'Enlist');

        const card = document.createElement("div");
        card.className = `subject-card ${cardClass}`;

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

        const btn = document.createElement("button");
        btn.className = `btn-enlist ${isEnlisted ? 'enlisted' : ''}`;
        btn.disabled = isDisabled || isEnlisted;
        btn.textContent = buttonText;

        btn.addEventListener('click', (event) => {
            toggleEnlist(uniqueId, event);
        });

        card.appendChild(btn);
        container.appendChild(card);
    });
}

// --- TOGGLE ENLIST ---
function toggleEnlist(uniqueId, event) {
    if (event && event.target.disabled) {
        return;
    }

    const parts = uniqueId.split('-');
    if (parts.length !== 2) {
        console.error("Invalid ID passed to toggleEnlist:", uniqueId);
        return;
    }
    const subjectCodeOnly = parts[0].trim().toUpperCase();

    if (subjectsAlreadyTaken.includes(uniqueId)) {
        alert(`Error: Subject ${subjectCodeOnly} is already enlisted or enrolled.`);
        if (event) event.preventDefault();
        return;
    }

    if (enlistedSubjects.includes(uniqueId)) {
        // UNENLIST
        enlistedSubjects = enlistedSubjects.filter(id => id !== uniqueId);
    } else {
        // ENLIST
        const allActiveSubjects = [...enlistedSubjects, ...subjectsAlreadyTaken];

        // Check for same subject different section
        const isSubjectCodeEnlisted = allActiveSubjects.some(id => {
            const idParts = id.split('-');
            return idParts.length === 2 && idParts[0].trim().toUpperCase() === subjectCodeOnly;
        });

        if (isSubjectCodeEnlisted) {
            alert(`You have already selected a section of ${subjectCodeOnly}. Please remove it first or check your enrolled subjects.`);
            return;
        }

        // Check for schedule conflict (check against ALL active subjects)
        const [newCode, newSection] = parts;
        const conflict = checkConflict(newCode, newSection, subjects, allActiveSubjects);

        if (conflict) {
            alert(`ERROR: Schedule conflict detected!\nYou cannot enlist ${newCode} because its schedule conflicts with ${conflict.existingSubject} on ${conflict.conflictDay}.`);
            return;
        }

        enlistedSubjects.push(uniqueId);
    }

    applyFiltersOnClient();
    updateSummary();
}

// --- UPDATE SUMMARY ---
function updateSummary() {
    const allSelected = [...new Set([...enlistedSubjects, ...subjectsAlreadyTaken])];
    const totalSubjects = allSelected.length;

    console.log("updateSummary called - allSelected:", allSelected);
    console.log("subjects array length:", subjects.length);

    const totalUnits = allSelected.reduce((acc, uniqueId) => {
        const parts = uniqueId.split('-');
        if (parts.length !== 2) {
            console.warn(`Skipping invalid ID in summary: ${uniqueId}`);
            return acc;
        }
        const [subjectCode, section] = parts;

        const sub = subjects.find(s => s.code === subjectCode && String(s.section) === String(section));

        if (!sub) {
            console.warn(`Subject not found for ID: ${uniqueId} (code: ${subjectCode}, section: ${section})`);
        }

        return acc + (sub ? sub.units : 0);
    }, 0);

    console.log("Total units calculated:", totalUnits);

    document.getElementById("total-units").innerText = `${totalUnits}/24`;
    document.getElementById("total-subjects").innerText = totalSubjects;
}

// --- CLEAR ALL ---
function clearAll() {
    enlistedSubjects = [];
    applyFiltersOnClient();
    updateSummary();
}

// --- SUBMIT ENLISTMENT ---
async function submitEnlistment() {
    const submitBtn = document.querySelector('.summary-card .btn-primary');
    if (submitBtn && submitBtn.disabled) {
        alert("Please wait for your student profile data to finish loading before submitting.");
        return;
    }

    if (enlistedSubjects.length === 0 && subjectsAlreadyTaken.length === 0) {
        alert("Please enlist at least one subject before submitting.");
        return;
    }

    const finalStudentId = studentProfile.student_id || localStorage.getItem('PLM_Student_ID');

    if (!finalStudentId) {
        alert("CRITICAL ERROR: Failed to retrieve Student ID for submission/redirect. Please re-login.");
        return;
    }

    const allEnlistedUnique = [...new Set([...enlistedSubjects, ...subjectsAlreadyTaken])];

    const finalSelection = subjects.filter(sub => {
        const uniqueId = getUniqueSubjectId(sub.code, sub.section);
        return uniqueId && allEnlistedUnique.includes(uniqueId);
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

        if (data.success) {
            const mappedStudent = {
                id: finalStudentId,
                name: `${studentProfile.first_name} ${studentProfile.last_name}`,
                program: studentProfile.program,
                status: studentProfile.status,
                year: studentProfile.year_level
            };

            const registrationData = {
                student: mappedStudent,
                subjects: finalSelection,
                date: new Date().toLocaleDateString()
            };

            console.log("Saving enlistment data to localStorage:", registrationData);
            localStorage.setItem("PLM_Enlistment_Data", JSON.stringify(registrationData));

            const checkData = localStorage.getItem("PLM_Enlistment_Data");
            if (!checkData) {
                alert("CRITICAL: Failed to write data to browser storage. Check browser settings.");
                console.error("Local Storage write failed: PLM_Enlistment_Data is null after setItem.");
                return;
            }

            alert(data.message + " Preparing registration form for printing.");
            window.open(`RegistrationForm.html?studentId=${encodeURIComponent(finalStudentId)}`, "_blank");
        } else {
            alert("Enlistment Failed: " + data.message);
        }
    } catch (error) {
        console.error("Submission error:", error);
        alert(`Submission Failed. Reason: ${error.message}. Please check the console and network tab.`);
    }
}

// --- EVENT LISTENERS ---
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

// --- DROPDOWN HANDLERS ---
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

// --- SCROLL SHADOW ---
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ============================================
// ★ SCHEDULE CONFLICT DETECTION (FIXED) ★
// ============================================

/**
 * Parse schedule string into array of schedule objects
 * Handles formats like: "MWF 10:00 AM - 11:30 AM / TTH 2:00 PM - 3:30 PM"
 */
function parseSchedule(scheduleString) {
    if (!scheduleString) return [];

    const scheduleParts = scheduleString.split(' / ');

    return scheduleParts.map(part => {
        const match = part.trim().match(/([MTWThFS]+)\s+(\d{1,2}:\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);

        if (!match) {
            console.error("Schedule Parse Error:", part, "from full string:", scheduleString);
            return null;
        }

        const days = match[1].toUpperCase(); // Normalize to uppercase
        const startMinutes = timeToMinutes(match[2], match[3]);
        const endMinutes = timeToMinutes(match[4], match[5]);

        return { days, start: startMinutes, end: endMinutes };
    }).filter(p => p !== null);
}

/**
 * Convert 12-hour time to minutes since midnight
 */
function timeToMinutes(timeStr, period) {
    let [hour, minute] = timeStr.split(':').map(Number);

    if (period.toUpperCase() === 'PM' && hour !== 12) {
        hour += 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
        hour = 0; // Midnight
    }

    return hour * 60 + minute;
}

/**
 * Split days string into array, handling "TH" as single unit
 * Examples: "MWF" -> ["M","W","F"], "TTH" -> ["T","TH"]
 */
function splitDays(daysStr) {
    if (!daysStr) return [];

    const result = [];
    let i = 0;
    const upper = daysStr.toUpperCase();

    while (i < upper.length) {
        if (upper[i] === 'T' && upper[i + 1] === 'H') {
            result.push('TH');
            i += 2;
        } else {
            result.push(upper[i]);
            i++;
        }
    }
    return result;
}

/**
 * Check if two day strings have any overlapping days
 * Examples:
 *   "MWF" vs "MW" -> true (overlaps M and W)
 *   "MWF" vs "TTH" -> false (no overlap)
 *   "TH" vs "Th" -> true (case insensitive)
 */
function daysOverlap(days1, days2) {
    const d1 = splitDays(days1);
    const d2 = splitDays(days2);
    return d1.some(day => d2.includes(day));
}

/**
 * Find which specific days overlap between two day strings
 * Example: "MWF" vs "MW" -> "MW"
 */
function findOverlapDays(days1, days2) {
    const d1 = splitDays(days1);
    const d2 = splitDays(days2);
    return d1.filter(day => d2.includes(day)).join('');
}

/**
 * Main conflict detection function
 * Returns conflict object if found, null otherwise
 */
function checkConflict(newSubjectCode, newSection, subjectsList, currentEnlisted) {
    // Find the new subject
    const newSub = subjectsList.find(s => s.code === newSubjectCode && String(s.section) === String(newSection));
    if (!newSub) return null;

    const newSchedules = parseSchedule(newSub.schedule);
    const newUniqueId = getUniqueSubjectId(newSubjectCode, newSection);

    // Check against all enlisted subjects
    for (const uniqueId of currentEnlisted) {
        // Skip checking against itself
        if (uniqueId === newUniqueId) continue;

        const parts = uniqueId.split('-');
        if (parts.length !== 2) continue;

        const [code, section] = parts;

        const existingSub = subjectsList.find(s => s.code === code && String(s.section) === section);
        if (!existingSub) continue;

        const existingSchedules = parseSchedule(existingSub.schedule);

        // Compare all schedule combinations
        for (const newSched of newSchedules) {
            for (const existingSched of existingSchedules) {
                // Check if days overlap
                if (daysOverlap(newSched.days, existingSched.days)) {
                    // Check if times overlap
                    const overlap = Math.min(newSched.end, existingSched.end) -
                                   Math.max(newSched.start, existingSched.start);

                    // Conflict only if overlap is positive (sharing time)
                    // overlap = 0 means back-to-back (allowed)
                    if (overlap > 0) {
                        return {
                            existingSubject: existingSub.code,
                            conflictDay: findOverlapDays(newSched.days, existingSched.days)
                        };
                    }
                }
            }
        }
    }

    return null; // No conflict
}