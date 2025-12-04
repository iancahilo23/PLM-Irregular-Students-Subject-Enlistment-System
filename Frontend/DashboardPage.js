document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. SPLASH SCREEN LOGIC (With Memory) ---
    const splash = document.getElementById('dashboard-splash');
    const content = document.getElementById('dashboard-content');

    // Check if we have already shown the splash screen in this session
    const hasSeenSplash = sessionStorage.getItem('plm_dashboard_seen');

    if (hasSeenSplash) {
        // CASE A: User has seen it. Hide splash IMMEDIATELY.
        splash.style.display = 'none';
        content.classList.remove('hidden');
    } else {
        // CASE B: First time. Show splash, then fade out.
        
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
});

// --- 3. TAB SWITCHING LOGIC ---
function switchTab(element) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => link.classList.remove('active'));
    element.classList.add('active');
}