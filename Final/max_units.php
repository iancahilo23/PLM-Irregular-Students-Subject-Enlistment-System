<?php
// max_units.php - Complete script to return max units based on student status and curriculum
// Ensure db_conn.php is in the same directory and contains the connection logic.
include('db_conn.php');

/**
 *
 * @param resource $conn The Oracle database connection resource.
 * @param string $student_id The ID of the student.
 * @return int The maximum units allowed.
 */
function get_max_units_php($conn, $student_id) {
    // 1. SQL to fetch status, year_level, and semester
    $sql = "
        SELECT
            s.year_level,
            s.semester,
            rs.registration_title AS status
        FROM STUDENT s
        JOIN REGISTRATION_STATUS rs ON s.registration_id = rs.registration_id
        WHERE s.student_id = :id
    ";

    $stmt = oci_parse($conn, $sql);
    oci_bind_by_name($stmt, ":id", $student_id);

    if (!oci_execute($stmt) || !($row = oci_fetch_assoc($stmt))) {
        // Safe default on error (cannot enlist or data missing)
        return 0;
    }

    $status = strtoupper($row['STATUS']);
    $year = (int)$row['YEAR_LEVEL'];
    $semester = (int)$row['SEMESTER'];

    // 2. PRIMARY LOGIC: Institutional Caps
    if ($status === 'ON LEAVE') {
        return 0;
    }

    $irregular_cap = 18; // Institutional cap for irregular students

    // 3. SECONDARY LOGIC: Curriculum-based Term Load
    // Set a default cap, will be overwritten by specific rules below
    $term_max_units = 24;

    // --- SECOND SEMESTER UNIT CAPS (from IT CURRICULUM 2020.csv) ---
    if ($semester === 2) {
        if ($year === 1) {
            $term_max_units = 22; // First Year, Second Semester: 22 units
        } elseif ($year === 2) {
            $term_max_units = 24; // Second Year, Second Semester: 24 units
        } elseif ($year === 3) {
            $term_max_units = 12; // Third Year, Second Semester: 12 units
        } elseif ($year === 4) {
            $term_max_units = 6;  // Fourth Year, Second Semester: 6 units
        }
    }

    // --- FIRST SEMESTER UNIT CAPS (Example) ---
    elseif ($semester === 1) {
        if ($year === 1) {
            $term_max_units = 21; // First Year, First Semester: 21 units
        }
        // Add more elseif blocks for other First Semester caps here if needed
    }


    // 4. FINAL CHECK: Apply Irregular Cap if applicable
    if ($status === 'IRREGULAR') {
        return min($irregular_cap, $term_max_units);
    } else {
        // Regular student uses the curriculum term cap
        return $term_max_units;
    }
}

// =========================================================================
// !!! EXECUTION BLOCK !!!
// This block ensures the function is called and the result is outputted.
// =========================================================================

// Set headers to ensure clean output (plain text, no HTML)
header('Content-Type: text/plain');

// Ensure database connection is established
$conn = db_connect();

if ($conn) {
    // Get student ID from the URL query parameter
    if (isset($_GET['student_id'])) {
        $student_id = $_GET['student_id'];

        // Call the function and output the result
        $max_units = get_max_units_php($conn, $student_id);
        echo $max_units;

    } else {
        // Output 0 if student_id is missing
        echo 0;
    }
    oci_close($conn);
} else {
    // Output 0 if database connection fails
    echo 0;
}

// Ensure nothing else is outputted after the unit number
exit;

?>