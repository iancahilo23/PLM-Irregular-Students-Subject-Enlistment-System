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
// 3. THE CURSOR APPROACH
// =============================================================

// A. Prepare the Procedure Call
$sql = "BEGIN GET_STUDENT_DASHBOARD(:id, :cursor_ptr); END;";
$stid = oci_parse($conn, $sql);

// B. Create a Cursor Variable in PHP
$p_cursor = oci_new_cursor($conn);

// C. Bind Parameters
// :id is Input (The Student ID)
// :cursor_ptr is Output (The Data)
oci_bind_by_name($stid, ":id", $student_id);
oci_bind_by_name($stid, ":cursor_ptr", $p_cursor, -1, OCI_B_CURSOR);

// D. Execute the Procedure (This opens the door)
if (!oci_execute($stid)) {
    $e = oci_error($stid);
    echo json_encode(['success' => false, 'message' => 'Procedure Failed: ' . $e['message']]);
    exit;
}

// E. Execute the Cursor (This walks through the door to get data)
if (!oci_execute($p_cursor)) {
    $e = oci_error($p_cursor);
    echo json_encode(['success' => false, 'message' => 'Cursor Failed: ' . $e['message']]);
    exit;
}

// 4. FETCH DATA FROM THE CURSOR
$row = oci_fetch_assoc($p_cursor);

if ($row) {
    // --- (The Logic Below Remains Exactly the Same) ---

    // Program Logic
    $program_full = $row['COURSE_TITLE'] ? $row['COURSE_TITLE'] : $row['COURSE_ID'];

    // College Logic
    $course_id = trim($row['COURSE_ID']);
    $college = "Unknown College";

    if (strpos($course_id, 'BSIT') === 0 || strpos($course_id, 'BSCS') === 0) {
        $college = "College of Information Systems and Technology Management";
    } 
    elseif (strpos($course_id, 'BSA') === 0) {
        $college = "College of Accountancy";
    }
    elseif (strpos($course_id, 'BS Arch') === 0) {
        $college = "College of Architecture and Sustainable Built Environments";
    }
    elseif (strpos($course_id, 'BSBA') === 0 || strpos($course_id, 'BSE') === 0) {
        $college = "College of Business Administration";
    }
    elseif (strpos($course_id, 'BS CE') === 0 || strpos($course_id, 'BS ME') === 0) {
        $college = "College of Engineering";
    }
    elseif (strpos($course_id, 'BS PT') === 0) {
        $college = "College of Physical Therapy";
    }
    elseif (strpos($course_id, 'BS N') === 0) {
        $college = "College of Nursing";
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

    // Prepare Response
    $data = [
        'student_id' => $row['STUDENT_ID'],
        'first_name' => $row['FIRSTNAME'],
        'last_name'  => $row['LASTNAME'],
        'program'    => $program_full,
        'college'    => $college,
        'year_level' => $row['YEAR_LEVEL'], 
        'semester'   => $row['SEMESTER'],
        'section'    => $row['COURSE_ID'] . ' ' . $row['YEAR_LEVEL'] . '-' . $row['SECTION'],
        'school_year' => $row['SCHOOL_YEAR'],
        'email'      => strtolower($row['FIRSTNAME'] . '.' . $row['LASTNAME'] . '@plm.edu.ph'),
        'status'            => $status_display,
        'enrollment_status' => $enrollment_display,
        'gwa'               => '1.75' // Hardcoded (Scope Exclusion)
    ];

    echo json_encode(['success' => true, 'data' => $data]);
} else {
    echo json_encode(['success' => false, 'message' => 'Student not found']);
}

// 5. CLEAN UP
oci_free_statement($stid);
oci_free_statement($p_cursor); // Close the cursor specifically
oci_close($conn);
?>