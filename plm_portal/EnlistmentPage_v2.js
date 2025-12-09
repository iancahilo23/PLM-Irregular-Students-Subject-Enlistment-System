// EnlistmentPage.js - FIXED UNIT & SLOT LIMITS

// --- Global Scope for access ---
let subjects = [];
let enlistedSubjects = [];
let subjectsAlreadyTaken = [];
let studentProfile = {};

let currentSearchTerm = '';
let currentDepartmentFilter = 'All departments';
let showOnlyAvailableSlots = false;
const MAX_ALLOWED_UNITS = 24; 

// --- Helper: Standardize Subject ID Format ---
function getUniqueSubjectId(subjectCode, section) {
    if (!subjectCode || !section) return null;
    return subjectCode.trim().toUpperCase() + '-' + String(section).trim();
}

// --- Helper: Calculate Total Units ---
function calculateTotalUnits(idList) {
    return idList.reduce((acc, uniqueId) => {
        const parts = uniqueId.split('-');
        if (parts.length !== 2) return acc;
        
        // Find subject in the master list
        const sub = subjects.find(s => s.code === parts[0] && String(s.section) === parts[1]);
        
        // Ensure we parse units as float to avoid string concatenation errors
        const units = sub ? parseFloat(sub.units) : 0;
        return acc + units;
    }, 0);
}

// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", () => {
    loadProfileAndInitialize();
    fetchEnlistedSubjects();
    setupEventListeners();
});

// --- Profile Loader ---
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
            if (submitBtn) submitBtn.textContent = 'Profile Load Failed';
        }
    } catch (error) {
        console.error('Error fetching student profile:', error);
        if (submitBtn) submitBtn.textContent = 'Connection Error';
    }
}

// --- Fetch Enlisted Subjects ---
async function fetchEnlistedSubjects() {
    try {
        const response = await fetch('get_enlisted_subjects.php');
        const data = await response.json();
        if (data.success) {
            subjectsAlreadyTaken = (data.enlistedSubjects || []).map(id => {
                const parts = id.split('-');
                return (parts.length === 2) ? getUniqueSubjectId(parts[0], parts[1]) : null;
            }).filter(id => id !== null);

            // Fetch subjects AFTER knowing what is already taken
            fetchSubjects();
        } else {
            console.warn("Could not fetch enlisted subjects: " + data.message);
            fetchSubjects(); // Load subjects anyway
        }
    } catch (error) {
        console.error("Error fetching enlisted subjects:", error);
        fetchSubjects();
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
            updateSummary();
        } else {
            console.error("Failed to fetch subjects:", data.message);
            document.getElementById("subject-list").innerHTML = `<p class="subtitle">Error: ${data.message}</p>`;
        }
    } catch (error) {
        console.error("Network error:", error);
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

        if (enlistedSubjects.includes(uniqueId) || subjectsAlreadyTaken.includes(uniqueId)) {
            return true;
        }

        if (currentSearchTerm) {
            const lowerSearchTerm = currentSearchTerm.toLowerCase();
            const passesSearch = sub.code.toLowerCase().includes(lowerSearchTerm) ||
                                sub.description.toLowerCase().includes(lowerSearchTerm);
            if (!passesSearch) return false;
        }

        if (showOnlyAvailableSlots) {
            const parts = sub.slots.split('/'); 
            const taken = parseInt(parts[0], 10);
            const max = parseInt(parts[1], 10);
            if ((max - taken) <= 0) return false;
        }

        return true;
    });

    renderSubjects(filteredList);
}

// --- RENDER SUBJECTS (Updated Logic) ---
function renderSubjects(list = subjects) {
    const container = document.getElementById("subject-list");
    document.getElementById("subject-count").innerText = list.length;
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `<p class="subtitle">No subjects found.</p>`;
        return;
    }

    // ★ NEW: Calculate Total Units currently held ★
    const allActiveSubjects = [...enlistedSubjects, ...subjectsAlreadyTaken];
    const currentTotalUnits = calculateTotalUnits(allActiveSubjects);

    list.forEach(sub => {
        const uniqueId = getUniqueSubjectId(sub.code, sub.section);
        if (!uniqueId) return;

        const isEnlisted = enlistedSubjects.includes(uniqueId);
        const isAlreadyTaken = subjectsAlreadyTaken.includes(uniqueId);

        let isDisabled = false;
        let warningMessage = '';
        let cardClass = '';

        // 1. Check Max Units Cap (Disable if adding this subject exceeds 24)
        // We only check this if the subject is NOT already enlisted/taken
        if (!isEnlisted && !isAlreadyTaken) {
            if (currentTotalUnits + parseFloat(sub.units) > MAX_ALLOWED_UNITS) {
                isDisabled = true;
                warningMessage = '⚠️ Max units reached (24 units limit)';
                cardClass = 'disabled-card';
            }
        }

        // 2. Check Slots (Full Section) - Overrides Unit warning if full
        if (sub.slots) {
            const slotParts = sub.slots.split('/');
            const taken = parseInt(slotParts[0], 10);
            const max = parseInt(slotParts[1], 10);
            
            if (taken >= max && !isEnlisted && !isAlreadyTaken) {
                isDisabled = true;
                warningMessage = '⚠️ Section is Full';
                cardClass = 'disabled-card';
            }
        }

        // 3. Check Duplicate/Existing Status
        if (isAlreadyTaken) {
            isDisabled = true;
            warningMessage = '⚠️ Already Enrolled';
            cardClass = 'taken-subject';
        } 
        
        // 4. Check Schedule Conflicts (Only if not already disabled)
        else if (!isDisabled && !isEnlisted) {
            const subjectCodeOnly = sub.code.trim().toUpperCase();

            // Check if another section of same subject is selected
            const enlistedOtherSectionId = allActiveSubjects.find(id => {
                const parts = id.split('-');
                return parts.length === 2 && parts[0].trim().toUpperCase() === subjectCodeOnly && id !== uniqueId;
            });

            if (enlistedOtherSectionId) {
                isDisabled = true;
                const enlistedSection = enlistedOtherSectionId.split('-')[1];
                warningMessage = `⚠️ Section ${enlistedSection} already selected.`;
                cardClass = 'disabled-card';
            } else {
                // Check Time Conflict
                const conflict = checkConflict(sub.code, sub.section, subjects, allActiveSubjects);
                if (conflict) {
                    isDisabled = true;
                    warningMessage = `❌ Conflict with ${conflict.existingSubject} (${conflict.conflictDay}).`;
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
                    <span>🕒 Schedule: ${sub.schedule} ${sub.faculty && sub.faculty !== ', ' ? '| ' + sub.faculty : ''}</span>
                    <span>Slots: ${sub.slots} | Room: ${sub.room}</span>
                    ${warningMessage ? `<p class="subject-warning">${warningMessage}</p>` : ''}
                </div>
            </div>
        `;

        const btn = document.createElement("button");
        btn.className = `btn-enlist ${isEnlisted ? 'enlisted' : ''}`;
        
        // ★ CRITICAL: Actually disable the HTML button ★
        btn.disabled = isDisabled || isEnlisted;
        btn.textContent = buttonText;

        // Prevent click if disabled (extra safety)
        if (!btn.disabled) {
            btn.addEventListener('click', (event) => {
                toggleEnlist(uniqueId, event);
            });
        }

        card.appendChild(btn);
        container.appendChild(card);
    });
}

// --- TOGGLE ENLIST (Updated Logic) ---
function toggleEnlist(uniqueId, event) {
    if (event && event.target.disabled) return;

    const parts = uniqueId.split('-');
    const subjectCodeOnly = parts[0].trim().toUpperCase();

    // UN-ENLIST
    if (enlistedSubjects.includes(uniqueId)) {
        enlistedSubjects = enlistedSubjects.filter(id => id !== uniqueId);
        applyFiltersOnClient();
        updateSummary();
        return;
    }

    // --- ENLIST CHECKS ---
    const allActiveSubjects = [...enlistedSubjects, ...subjectsAlreadyTaken];

    // 1. Check Max Units (Redundant check for security)
    const currentUnits = calculateTotalUnits(allActiveSubjects);
    const subToAdd = subjects.find(s => s.code === parts[0] && String(s.section) === parts[1]);
    
    if (subToAdd && (currentUnits + parseFloat(subToAdd.units) > MAX_ALLOWED_UNITS)) {
        alert("Cannot enlist: Maximum units (24) exceeded.");
        return;
    }

    // 2. Check Slots
    if (subToAdd && subToAdd.slots) {
        const [taken, max] = subToAdd.slots.split('/').map(Number);
        if (taken >= max) {
            alert("This section is full.");
            return;
        }
    }

    // 3. Add to list
    enlistedSubjects.push(uniqueId);
    applyFiltersOnClient();
    updateSummary();
}

// --- UPDATE SUMMARY ---
function updateSummary() {
    const allSelected = [...enlistedSubjects, ...subjectsAlreadyTaken];
    const totalSubjects = allSelected.length;
    const totalUnits = calculateTotalUnits(allSelected);

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
    if (submitBtn && submitBtn.disabled) return;

    if (enlistedSubjects.length === 0) {
        alert("Please enlist at least one new subject.");
        return;
    }

    const finalStudentId = studentProfile.student_id;
    const allEnlistedUnique = [...new Set([...enlistedSubjects, ...subjectsAlreadyTaken])];
    
    const finalSelection = subjects.filter(sub => {
        const uniqueId = getUniqueSubjectId(sub.code, sub.section);
        return uniqueId && enlistedSubjects.includes(uniqueId); // Only submit NEW subjects
    });

    const serverData = { subjects: finalSelection };

    try {
        const response = await fetch('submit_enlistment.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverData)
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            // Reload page to reflect changes
            location.reload(); 
        } else {
            alert("Enlistment Failed: " + data.message);
        }
    } catch (error) {
        console.error("Submission error:", error);
        alert(`Submission Failed. See console.`);
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
    document.getElementById("dropdown-options").classList.toggle("show");
}
window.onclick = function(event) {
    if (!event.target.closest('.custom-dropdown')) {
        const dropdowns = document.getElementsByClassName("dropdown-options");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) openDropdown.classList.remove('show');
        }
    }
}

// --- SCHEDULE CONFLICT UTILS ---
function parseSchedule(scheduleString) {
    if (!scheduleString) return [];
    return scheduleString.split(' / ').map(part => {
        const match = part.trim().match(/([MTWThFS]+)\s+(\d{1,2}:\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);
        if (!match) return null;
        return { 
            days: match[1].toUpperCase(), 
            start: timeToMinutes(match[2], match[3]), 
            end: timeToMinutes(match[4], match[5]) 
        };
    }).filter(p => p !== null);
}

function timeToMinutes(timeStr, period) {
    let [hour, minute] = timeStr.split(':').map(Number);
    if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    else if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
}

function checkConflict(newCode, newSection, subjectsList, currentEnlisted) {
    const newSub = subjectsList.find(s => s.code === newCode && String(s.section) === String(newSection));
    if (!newSub) return null;
    const newScheds = parseSchedule(newSub.schedule);
    const newId = getUniqueSubjectId(newCode, newSection);

    for (const uniqueId of currentEnlisted) {
        if (uniqueId === newId) continue;
        const [code, section] = uniqueId.split('-');
        const existingSub = subjectsList.find(s => s.code === code && String(s.section) === section);
        if (!existingSub) continue;
        const existingScheds = parseSchedule(existingSub.schedule);

        for (const ns of newScheds) {
            for (const es of existingScheds) {
                // Check Day Overlap
                const nDays = splitDays(ns.days);
                const eDays = splitDays(es.days);
                const overlapDay = nDays.find(d => eDays.includes(d));

                if (overlapDay) {
                    // Check Time Overlap
                    const overlap = Math.min(ns.end, es.end) - Math.max(ns.start, es.start);
                    if (overlap > 0) return { existingSubject: existingSub.code, conflictDay: overlapDay };
                }
            }
        }
    }
    return null;
}

function splitDays(daysStr) {
    const res = [];
    for(let i=0; i<daysStr.length; i++) {
        if(daysStr[i] === 'T' && daysStr[i+1] === 'H') { res.push('TH'); i++; }
        else res.push(daysStr[i]);
    }
    return res;
}