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

    // --- 2. ACTIVATE AIR DATEPICKER (WITH CUSTOM NAVIGATION) ---
    if (typeof AirDatepicker !== 'undefined') {
        
        // We assign it to a global variable so our HTML clicks can find it
        window.plmDatepicker = new AirDatepicker('#birthdate-input', {
            // Keep your locale settings
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
            
            position: 'top right', // Forces calendar to open upwards
            autoClose: true,
            dateFormat: 'yyyy-MM-dd',

            // --- CUSTOM TITLE LOGIC ---
            navTitles: {
                days: 'MMMM yyyy',   // Standard for days view
                months: 'yyyy',      // Standard for months view
                // Custom for YEARS view (e.g. 2010 - 2019)
                years: function(dp) {
                    // Calculate the decade start and end
                    const year = dp.viewDate.getFullYear();
                    const startYear = year - (year % 10);
                    const endYear = startYear + 9;

                    // Return HTML with onclick events
                    // event.stopPropagation() is CRITICAL: stops the calendar from zooming out
                    return `
                        <span class="custom-nav-year" onclick="event.stopPropagation(); window.plmDatepicker.prev()">
                            ${startYear}
                        </span> 
                        - 
                        <span class="custom-nav-year" onclick="event.stopPropagation(); window.plmDatepicker.next()">
                            ${endYear}
                        </span>
                    `;
                }
            },

            // Validation Fix
            onSelect: function({date, formattedDate, datepicker}) {
                 const group = birthdateInput.closest('.input-group');
                 group.classList.remove('show-error');
                 birthdateInput.classList.remove('error-border');
            }
        });

    } else {
        console.error("AirDatepicker library not found!");
    }

    // --- 3. HANDLE LOGIN VALIDATION ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let isValid = true;
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

        validateField(usernameInput);
        validateField(passwordInput);
        validateField(birthdateInput);

        if(isValid) {
            localStorage.setItem('plm_student_name', usernameInput.value.trim());
            const btn = loginForm.querySelector('button');
            btn.textContent = "Logging in...";
            btn.style.opacity = "0.8";
            setTimeout(() => {
                window.location.href = 'DashboardPage.html';
            }, 1000);
        }
    });

    // --- 4. CLEAR ERRORS ON TYPE ---
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('input', () => {
            const group = input.closest('.input-group');
            group.classList.remove('show-error');
            input.classList.remove('error-border');
        });
    });
});