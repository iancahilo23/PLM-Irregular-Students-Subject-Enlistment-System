// c:\xampp\htdocs\plm_portal\DashboardPage.js

document.addEventListener("DOMContentLoaded", () => {
    
    // --- GLOBAL VARIABLES ---
    const splash = document.getElementById('dashboard-splash');
    const content = document.getElementById('dashboard-content');
    const fabBtn = document.getElementById('fab-main-btn');
    const fabMenu = document.getElementById('fab-menu');
    const logoutBtn = document.getElementById('logout-btn');

    // 1. DATA FETCHING LOGIC (Connects to Oracle)
    async function loadStudentData() {
        try {
            console.log("Fetching student data..."); 

            const response = await fetch('get_student_data.php');
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const result = await response.json();
            console.log("Data received:", result);

            if (result.success && result.data) {
                const student = result.data;
                
                // Safe Helper to avoid null errors if an element is missing
                const setText = (id, text) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = text;
                };

                // A. Basic Information
                setText('display-name', `${student.first_name} ${student.last_name}`);
                setText('display-student-number', student.student_id);
                setText('display-email', student.email);
                setText('display-status', student.status);
                setText('display-gwa', student.gwa || '--');
                setText('display-program', student.program || '--');
                setText('display-college', student.college || '--');
                setText('display-year-level', student.year_level || '--');
                setText('display-semester', student.semester || '--');
                setText('display-section', student.section || '--');

                // B. Enrollment Status Sentence
                const statusBox = document.getElementById('display-full-status');
                if (statusBox) {
                    const statusText = `<span class="enrollment-highlight">${student.enrollment_status || 'ENROLLED'}</span>`;
                    statusBox.innerHTML = `${statusText} for School Year ${student.school_year} ${student.semester} Semester`;
                }

                // C. Overall Progress (Units & Percentage) -- NEW ADDITION
                setText('display-units-total', student.units_total);
                setText('display-units-acad', student.units_academic);
                setText('display-units-non', student.units_non_academic);
                
                // Percentage Text (Big Number)
                setText('display-progress-percent', `${student.progress_percent}%`);
                
                // Progress Description Text
                const descEl = document.getElementById('display-progress-desc');
                if (descEl) {
                    descEl.textContent = `You've completed ${student.progress_percent}% of your classes' overall assigned curriculum.`;
                }

            } else {
                console.error("Server reported error:", result.message);
                document.getElementById('display-name').textContent = "Student Not Found";
            }

        } catch (error) {
            console.error("Fetch error:", error);
            const nameEl = document.getElementById('display-name');
            if(nameEl) nameEl.textContent = "Connection Error";
        }
    }

    // 2. SMART SPLASH SCREEN LOGIC (With Memory)
    function handleSplash() {
        const hasSeenSplash = sessionStorage.getItem('plm_dashboard_seen');

        if (hasSeenSplash) {
            if (splash) splash.style.display = 'none';
            if (content) content.classList.remove('hidden');
        } else {
            if (splash && content) {
                setTimeout(() => {
                    splash.style.opacity = '0';
                    splash.style.transition = 'opacity 0.5s ease';

                    setTimeout(() => {
                        splash.style.display = 'none';
                        content.classList.remove('hidden');
                        sessionStorage.setItem('plm_dashboard_seen', 'true');
                    }, 500);

                }, 2000); 
            }
        }
    }

    // 3. FAB MENU & LOGOUT LOGIC
    if (fabBtn && fabMenu && logoutBtn) {
        
        fabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fabMenu.classList.toggle('active');
            fabBtn.style.transform = fabMenu.classList.contains('active') ? 'rotate(90deg)' : 'rotate(0deg)';
        });

        document.addEventListener('click', (e) => {
            if (!fabMenu.contains(e.target) && !fabBtn.contains(e.target)) {
                fabMenu.classList.remove('active');
                fabBtn.style.transform = 'rotate(0deg)';
            }
        });

        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear(); 
            localStorage.removeItem('plm_student_name'); 
            // IMPORTANT: Redirect to PHP to kill the session properly
            window.location.href = 'logout.php'; 
        });
    }

    // 4. INITIALIZE EVERYTHING
    handleSplash();
    loadStudentData();
});

// --- 5. TAB SWITCHING (Global Function) ---
function switchTab(element) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => link.classList.remove('active'));
    element.classList.add('active');
}