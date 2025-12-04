// --- MOCK DATA (Global Scope for access) ---
const subjects = [
    {
        id: 1,
        code: "CAP 0102",
        units: 3,
        description: "Capstone Project 2",
        schedule: "M 10:30AM - 1:30PM",
        room: "FIELD",
        slots: "34/40 slots",
        section: "1"
    },
    {
        id: 2,
        code: "EIT ELECTIVE",
        units: 3,
        description: "Professional Elective",
        schedule: "M 7:00AM - 10:30AM",
        room: "GCA 309",
        slots: "35/40 slots",
        section: "1"
    },
    {
        id: 3,
        code: "NET 0101",
        units: 3,
        description: "Networking 1",
        schedule: "T 1:00PM - 4:00PM",
        room: "COMP LAB 2",
        slots: "20/40 slots",
        section: "1"
    },
    {
        id: 4,
        code: "IAS 0101",
        units: 3,
        description: "Information Assurance",
        schedule: "W 9:00AM - 12:00PM",
        room: "GV 305",
        slots: "10/40 slots",
        section: "1"
    }
];

let enlistedSubjects = []; // Stores IDs of selected subjects

// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", () => {
    fetchStudentProfile(); // Load Student Info
    renderSubjects();      // Load Subject Cards
    updateSummary();       // Reset Counts
});

// --- 1. PROFILE DATA SIMULATION ---
function fetchStudentProfile() {
    // Simulating a database fetch
    const studentData = {
        name: "VERANO, BRAHM DANIEL",
        program: "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY",
        studentId: "2023-36053",
        yearLevel: "Third Year",
        semester: "First Semester",
        status: "Irregular"
    };

    // Inject into HTML
    const set = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    };

    set('student-name', studentData.name);
    set('student-program', studentData.program);
    set('student-id', studentData.studentId);
    set('student-year', studentData.yearLevel);
    set('current-semester', studentData.semester);
    set('student-status', studentData.status);
}

// --- 2. RENDER FUNCTIONS ---
function renderSubjects() {
    const container = document.getElementById("subject-list");
    document.getElementById("subject-count").innerText = subjects.length;
    
    container.innerHTML = ""; 

    subjects.forEach(sub => {
        const isEnlisted = enlistedSubjects.includes(sub.id);
        
        const card = document.createElement("div");
        card.className = "subject-card";
        
        card.innerHTML = `
            <div class="subject-info">
                <h4>${sub.code} (${sub.units} units)</h4>
                <p class="subject-desc">${sub.description}</p>
                <div class="subject-meta">
                    <span>🕒 ${sub.schedule}</span>
                    <span>📍 ${sub.room}</span>
                    <span>👥 ${sub.slots}</span>
                </div>
            </div>
            <button 
                class="btn-enlist ${isEnlisted ? 'enlisted' : ''}" 
                onclick="toggleEnlist(${sub.id})">
                ${isEnlisted ? '✓ Enlisted' : 'Enlist'}
            </button>
        `;
        
        container.appendChild(card);
    });
}

// --- 3. ACTIONS (Enlist/Unenlist) ---
function toggleEnlist(id) {
    if (enlistedSubjects.includes(id)) {
        enlistedSubjects = enlistedSubjects.filter(subId => subId !== id);
    } else {
        enlistedSubjects.push(id);
    }
    renderSubjects();
    updateSummary();
}

function updateSummary() {
    const totalSubjects = enlistedSubjects.length;
    const totalUnits = enlistedSubjects.reduce((acc, id) => {
        const sub = subjects.find(s => s.id === id);
        return acc + sub.units;
    }, 0);

    document.getElementById("total-units").innerText = `${totalUnits}/24`;
    document.getElementById("total-subjects").innerText = totalSubjects;
}

function clearAll() {
    enlistedSubjects = [];
    renderSubjects();
    updateSummary();
}

// --- 4. SUBMIT ENLISTMENT (Bridge to Registration Form) ---
function submitEnlistment() {
    if (enlistedSubjects.length === 0) {
        alert("Please enlist at least one subject.");
        return;
    }

    // Filter the full subject details based on selected IDs
    const finalSelection = subjects.filter(sub => enlistedSubjects.includes(sub.id));

    // Scrape student info from the DOM (since we populated it earlier)
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

    // Save to Browser Memory
    localStorage.setItem("PLM_Enlistment_Data", JSON.stringify(registrationData));

    // Open Registration Form
    window.open("RegistrationForm.html", "_blank");
}

// --- 5. CUSTOM DROPDOWN LOGIC ---
function toggleDropdown() {
    const options = document.getElementById("dropdown-options");
    options.classList.toggle("show");
}

function selectOption(value) {
    document.getElementById("selected-text").innerText = value;
    document.getElementById("dropdown-options").classList.remove("show");
    console.log("Selected Department:", value);
}

// Close dropdown when clicking outside
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

// --- 6. SCROLL SHADOW LOGIC ---
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});