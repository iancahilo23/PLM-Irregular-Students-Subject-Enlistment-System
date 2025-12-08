/* LoginPage.js */
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const splashScreen = document.getElementById('splash-screen');
    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    
    // Inputs
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const birthdateInput = document.getElementById('birthdate-input');

    // --- 1. SPLASH SCREEN LOGIC ---
    const hasSeenSplash = sessionStorage.getItem('plm_splash_seen');
    if (hasSeenSplash) {
        splashScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    } else {
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            sessionStorage.setItem('plm_splash_seen', 'true');
        }, 3000);
    }

    // --- 2. ACTIVATE AIR DATEPICKER (Optional Visual Only) ---
    if (typeof AirDatepicker !== 'undefined' && birthdateInput) {
        window.plmDatepicker = new AirDatepicker('#birthdate-input', {
            locale: {
                days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
                months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                today: 'Today',
                clear: 'Clear',
                dateFormat: 'yyyy-MM-dd',
                timeFormat: 'hh:mm aa',
                firstDay: 0
            },
            position: 'top right',
            autoClose: true
        });
    }

    // --- 3. HELPER FUNCTIONS ---
    const showError = (input, message) => {
        const group = input.closest('.input-group');
        const errorSpan = group.querySelector('.error-msg');

        group.classList.add('show-error');
        input.classList.add('error-border');

        if(errorSpan) {
            errorSpan.textContent = message;
            errorSpan.style.display = 'block';
        }
    };

    const clearErrors = () => {
        document.querySelectorAll('.error-msg').forEach(span => span.style.display = 'none');
        document.querySelectorAll('.input-group').forEach(group => group.classList.remove('show-error'));
        document.querySelectorAll('input').forEach(input => input.classList.remove('error-border'));
    };

    // --- 4. HANDLE LOGIN SUBMISSION ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        let isValid = true;

        // Basic Validation
        if (!username) {
            showError(usernameInput, "Please input username");
            isValid = false;
        }
        if (!password) {
            showError(passwordInput, "Please input password");
            isValid = false;
        }

        if (!isValid) return;

        // Visual Feedback
        const btn = loginForm.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = "Verifying...";
        btn.style.opacity = "0.8";

        try {
            // FETCH REQEST TO PHP
            const response = await fetch('login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {

                // ★ CRITICAL FIX: Ensure ONLY the correct PLM_Student_ID key is set.
                // This eliminates the old, conflicting 'plm_student_name' key.
                localStorage.setItem('PLM_Student_ID', data.studentId);

                // NOTE: The previous version of the code often included:
                // localStorage.setItem('plm_student_name', data.studentId);
                // This conflicting line is now completely eliminated.

                btn.textContent = "Success!";
                setTimeout(() => {
                    window.location.href = 'DashboardPage.html';
                }, 1000);
            } else {
                alert(data.message); // "Invalid Student ID or Password"
                btn.textContent = originalText;
                btn.style.opacity = "1";
            }

        } catch (error) {
            console.error('Error:', error);
            alert("Could not connect to the server.");
            btn.textContent = originalText;
            btn.style.opacity = "1";
        }
    });

    // --- 5. CLEAR ERRORS ON TYPE ---
    [usernameInput, passwordInput].forEach(input => {
        if(!input) return;
        input.addEventListener('input', () => {
            const group = input.closest('.input-group');
            group.classList.remove('show-error');
            input.classList.remove('error-border');
        });
    });
});