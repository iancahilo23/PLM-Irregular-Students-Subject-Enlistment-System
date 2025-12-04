document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    
    // Inputs
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const birthdateInput = document.getElementById('birthdate-input');

    // --- 1. SPLASH SCREEN LOGIC (UPDATED) ---
    
    // Check if the splash has been shown in this tab session
    const hasSeenSplash = sessionStorage.getItem('plm_splash_seen');

    if (hasSeenSplash) {
        // CASE A: User has seen it already.
        // Hide splash IMMEDIATELY and show login screen.
        splashScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    } else {
        // CASE B: First time visit.
        // Wait 3 seconds, then hide splash.
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            
            // Mark as seen in storage so it doesn't show again on reload
            sessionStorage.setItem('plm_splash_seen', 'true');
        }, 3000);
    }

    // --- 2. Handle Login Validation (Keep existing code) ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let isValid = true;

        // Validation Helper Function
        const validateField = (input) => {
            const group = input.closest('.input-group');
            if (!input.value.trim()) {
                group.classList.add('show-error');
                input.classList.add('error-border');
                isValid = false;
            } else {
                group.classList.remove('show-error');
                input.classList.remove('error-border');
            }
        };

        // Check all fields
        validateField(usernameInput);
        validateField(passwordInput);
        validateField(birthdateInput);

        // If all valid, proceed to login
        if(isValid) {
            // A. Save name
            localStorage.setItem('plm_student_name', usernameInput.value.trim());

            // B. Visual Feedback
            const btn = loginForm.querySelector('button');
            btn.textContent = "Logging in...";
            btn.style.opacity = "0.8";
            
            // C. Redirect
            setTimeout(() => {
                window.location.href = 'DashboardPage.html';
            }, 1000);
        }
    });

    // Optional: Clear error when user types
    const inputs = [usernameInput, passwordInput, birthdateInput];
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const group = input.closest('.input-group');
            group.classList.remove('show-error');
            input.classList.remove('error-border');
        });
    });
});