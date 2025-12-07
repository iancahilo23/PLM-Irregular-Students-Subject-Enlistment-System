document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. SPLASH SCREEN LOGIC (With Memory) ---
    const splash = document.getElementById('dashboard-splash');
    const content = document.getElementById('dashboard-content');

    // Check if we have already shown the splash screen in this session
    const hasSeenSplash = sessionStorage.getItem('plm_dashboard_seen');

    if (hasSeenSplash) {
        // CASE A: User has seen it. Hide splash IMMEDIATELY.
        if (splash) splash.style.display = 'none';
        if (content) content.classList.remove('hidden');
    } else {
        // CASE B: First time. Show splash, then fade out.
        if (splash && content) {
            // 1. Wait 2 seconds
            setTimeout(() => {
                // 2. Start fade out
                splash.style.opacity = '0';
                splash.style.transition = 'opacity 0.5s ease';

                // 3. When fade finishes, hide it and unlock content
                setTimeout(() => {
                    splash.style.display = 'none';
                    content.classList.remove('hidden');
                    
                    // 4. MARK AS SEEN (So it won't show on reload)
                    sessionStorage.setItem('plm_dashboard_seen', 'true');
                }, 500);

            }, 2000); 
        }
    }

    // --- 2. POPULATE MOCK DATA ---
    const studentData = {
        name: "ALCORAN, WILLARD JOHN",
        studentNumber: "2023-36053",
        email: "wjalcoran2023@plm.edu.ph",
        status: "Irregular",
        gwa: "2.23177"
    };

    const set = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.innerText = value;
    };

    set('display-name', studentData.name);
    set('display-student-number', studentData.studentNumber);
    set('display-email', studentData.email);
    set('display-status', studentData.status);
    set('display-gwa', studentData.gwa);


    // --- 3. FLOATING BUTTON & LOGOUT LOGIC (NEW) ---
    const fabBtn = document.getElementById('fab-main-btn');
    const fabMenu = document.getElementById('fab-menu');
    const logoutBtn = document.getElementById('logout-btn');

    // Only run this if the elements exist in HTML
    if (fabBtn && fabMenu && logoutBtn) {
        
        // A. Toggle Menu on Click
        fabBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stops click from closing immediately
            fabMenu.classList.toggle('active');
            
            // Rotate icon 90 degrees when open
            fabBtn.style.transform = fabMenu.classList.contains('active') ? 'rotate(90deg)' : 'rotate(0deg)';
        });

        // B. Close menu when clicking anywhere else on the page
        document.addEventListener('click', (e) => {
            if (!fabMenu.contains(e.target) && !fabBtn.contains(e.target)) {
                fabMenu.classList.remove('active');
                fabBtn.style.transform = 'rotate(0deg)';
            }
        });

        // C. HANDLE LOGOUT
        logoutBtn.addEventListener('click', () => {
            // 1. Clear session data
            sessionStorage.clear(); // Resets splash screen history
            localStorage.removeItem('plm_student_name'); // Clears user data
            
            // 2. Redirect to Login Page
            window.location.href = 'LoginPage.html'; 
        });
    }
});

// --- 4. TAB SWITCHING LOGIC (Global) ---
function switchTab(element) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => link.classList.remove('active'));
    element.classList.add('active');
}   