<?php
// max_units.php - FIXED FOR ORACLE OCI

require_once 'db_conn.php';

// Check for connection success
if (!isset($conn)) {
    http_response_code(500);
    echo "Connection failed"; // Will result in MAX_UNITS = 24 in JS
    exit;
}

// **FIXED UNIT MAP** based on BSIT 2020 Curriculum Total Units (excluding PE/NSTP)
$max_units_map = [
    '2nd' => [
        1 => 16, // First Year, Second Semester
        2 => 24, // Second Year, Second Semester - MATCHES
        3 => 12, // Third Year, Second Semester - MATCHES
        4 => 12, // Fourth Year, Second Semester (Praticum is included)
    ],
];

$fallback_max_units = 24;
// ... rest of the code remains the same ...

// If your system includes PE/NSTP units in the unit limit,
// you would adjust the values: e.g., First Year, Second Semester would be 16 + 2 (PE) = 18.