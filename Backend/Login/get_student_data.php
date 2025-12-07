<?php
// c:\xampp\htdocs\plm_portal\get_student_data.php

session_start(); 

// 1. SETTINGS & HEADERS
error_reporting(0);
ini_set('display_errors', 0);
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header('Content-Type: application/json');

require_once 'db_conn.php'; 

// 2. CHECK LOGIN
if (!isset($_SESSION['student_id'])) {
    echo json_encode(['success' => false, 'message' => 'No user logged in']);
    exit;
}

$student_id = $_SESSION['student_id'];

// =============================================================
// 3. THE CURSOR APPROACH (Calling the Stored Procedure)
// =============================================================

// A. Prepare the Procedure Call
$sql = "BEGIN GET_STUDENT_DASHBOARD(:id, :cursor_ptr); END;";
$stid = oci_parse($conn, $sql);

// B. Create a Cursor Variable in PHP
$p_cursor = oci_new_cursor($conn);

// C. Bind Parameters
oci_bind_by_name($stid, ":id", $student_id);
oci_bind_by_name($stid, ":cursor_ptr", $p_cursor, -1, OCI_B_CURSOR);

// D. Execute the Procedure
if (!oci_execute($stid)) {
    $e = oci_error($stid);
    echo json_encode(['success' => false, 'message' => 'Procedure Failed: ' . $e['message']]);
    exit;
}

// E. Execute the Cursor
if (!oci_execute($p_cursor)) {
    $e = oci_error($p_cursor);
    echo json_encode(['success' => false, 'message' => 'Cursor Failed: ' . $e['message']]);
    exit;
}

// 4. FETCH DATA FROM THE CURSOR
$row = oci_fetch_assoc($p_cursor);

if ($row) {
    // --- BASIC INFORMATION ---
    $program_full = $row['COURSE_TITLE'] ? $row['COURSE_TITLE'] : $row['COURSE_ID'];
    $course_id = trim($row['COURSE_ID']);

    // =========================================================
    // FIX: COLLEGE LOGIC (Database Priority)
    // =========================================================
    
    // 1. Try to fetch the college from the database result using various possible aliases
    $db_college = $row['college_title'] ?? $row['college'] ?? $row['COLLEGE_TITLE'] ?? $row['COLLEGE'] ?? null;

    // 2. If DB returned a valid college, use it. Otherwise, fall back to hardcoded map.
    if (!empty($db_college) && $db_college !== 'No College Assigned' && $db_college !== 'No College Found') {
        $college = $db_college;
    } else {
        // FALLBACK: Hardcoded mapping (Safety net)
        $college = "Unknown College";

        // Changed to 'stripos' for case-insensitive matching
        if (stripos($course_id, 'BSIT') !== false || stripos($course_id, 'BSCS') !== false) {
            $college = "College of Information Systems and Technology Management";
        } 
        elseif (stripos($course_id, 'BSA') !== false) {
            $college = "College of Accountancy";
        }
        elseif (stripos($course_id, 'BS Arch') !== false) {
            $college = "College of Architecture and Sustainable Built Environments";
        }
        elseif (stripos($course_id, 'BSBA') !== false || stripos($course_id, 'BSE') !== false) {
            $college = "College of Business Administration";
        }
        elseif (stripos($course_id, 'BS CE') !== false || stripos($course_id, 'BS ME') !== false) {
            $college = "College of Engineering";
        }
        elseif (stripos($course_id, 'BS PT') !== false) {
            $college = "College of Physical Therapy";
        }
        elseif (stripos($course_id, 'BS N') !== false) {
            $college = "College of Nursing";
        }
    }

    // Status Logic
    if (!empty($row['REGISTRATION_TITLE'])) {
        $status_display = $row['REGISTRATION_TITLE'];
    } elseif ($row['REGISTRATION_ID'] == 'IRR') {
        $status_display = 'Irregular';
    } else {
        $status_display = 'Regular';
    }

    // Enrollment Logic
    $enrollment_display = (!empty($row['DATE_ENROLLED'])) ? 'ENROLLED' : 'NOT ENROLLED';

    // --- UNIT & PERCENTAGE CALCULATIONS ---
    
    // 1. Get Values from DB (From the Stored Procedure subqueries)
    $acad_units = isset($row['ACADEMIC_UNITS']) ? floatval($row['ACADEMIC_UNITS']) : 0;
    $non_acad_units = isset($row['NON_ACADEMIC_UNITS']) ? floatval($row['NON_ACADEMIC_UNITS']) : 0;

    // 2. Calculate Total
    $total_units = $acad_units + $non_acad_units;

    // 3. Calculate Percentage (Assuming 180 units is the full curriculum)
    $max_units = 180; 
    $progress_percent = ($total_units > 0) ? ($total_units / $max_units) * 100 : 0;
    
    // Cap at 100%
    if ($progress_percent > 100) $progress_percent = 100;

    // --- PREPARE RESPONSE ---
    $data = [
        'student_id' => $row['STUDENT_ID'],
        'first_name' => $row['FIRSTNAME'],
        'last_name'  => $row['LASTNAME'],
        'program'    => $program_full,
        'college'    => $college, // Uses the fixed logic above
        'year_level' => $row['YEAR_LEVEL'], 
        'semester'   => $row['SEMESTER'],
        'section'    => $row['COURSE_ID'] . ' ' . $row['YEAR_LEVEL'] . '-' . $row['SECTION'],
        'school_year' => $row['SCHOOL_YEAR'],
        'email'      => strtolower($row['FIRSTNAME'] . '.' . $row['LASTNAME'] . '@plm.edu.ph'),
        'status'            => $status_display,
        'enrollment_status' => $enrollment_display,
        'gwa'               => '1.75', 

        // New Calculated Fields
        'units_total'       => $total_units,
        'units_academic'    => $acad_units,
        'units_non_academic'=> $non_acad_units,
        'progress_percent'  => round($progress_percent)
    ];

    echo json_encode(['success' => true, 'data' => $data]);
} else {
    echo json_encode(['success' => false, 'message' => 'Student not found']);
}

// 5. CLEAN UP
oci_free_statement($stid);
oci_free_statement($p_cursor); 
oci_close($conn);
?>