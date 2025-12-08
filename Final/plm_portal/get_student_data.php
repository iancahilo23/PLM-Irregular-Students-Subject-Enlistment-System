<?php
// c:\xampp\htdocs\plm_portal\get_student_data.php

session_start(); 

// 1. SETTINGS & HEADERS
error_reporting(E_ALL);
ini_set('display_errors', 0); // Keep 0 so errors don't break JSON structure
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
// 3. CALL THE STORED PROCEDURE
// =============================================================

// Prepare the procedure call
$sql = "BEGIN GET_STUDENT_DASHBOARD(:id, :cursor_ptr); END;";
$stid = oci_parse($conn, $sql);
$p_cursor = oci_new_cursor($conn);

// Bind Parameters
oci_bind_by_name($stid, ":id", $student_id);
oci_bind_by_name($stid, ":cursor_ptr", $p_cursor, -1, OCI_B_CURSOR);

// Execute Procedure
if (!oci_execute($stid)) {
    $e = oci_error($stid);
    echo json_encode(['success' => false, 'message' => 'Procedure Failed: ' . $e['message']]);
    exit;
}

// Execute Cursor
if (!oci_execute($p_cursor)) {
    $e = oci_error($p_cursor);
    echo json_encode(['success' => false, 'message' => 'Cursor Failed: ' . $e['message']]);
    exit;
}

// 4. FETCH DATA FROM THE CURSOR
$row = oci_fetch_assoc($p_cursor);

if ($row) {
    // A. Generate Email Manually (Since it was removed from DB procedure)
    $clean_first = str_replace(' ', '', $row['FIRSTNAME']);
    $clean_last  = str_replace(' ', '', $row['LASTNAME']);
    $email_gen   = strtolower($clean_first . '.' . $clean_last . '@plm.edu.ph');

    // B. Get Unit Calculations from the View result
    $acad = floatval($row['ACADEMIC_UNITS']);
    $non_acad = floatval($row['NON_ACADEMIC_UNITS']);
    $total = $acad + $non_acad;
    
    // C. Calculate Percentage (Assuming 180 units is the full curriculum)
    $max_units = 180;
    $percent = ($total > 0) ? round(($total / $max_units) * 100) : 0;
    if ($percent > 100) $percent = 100;

    // D. Prepare Response
    $data = [
        'student_id'        => $row['STUDENT_ID'],
        'first_name'        => $row['FIRSTNAME'],
        'last_name'         => $row['LASTNAME'],
        'email'             => $email_gen,
        'program'           => $row['COURSE_TITLE'],
        'college'           => $row['COLLEGE_TITLE'],
        'year_level'        => $row['YEAR_LEVEL'], 
        'semester'          => $row['SEMESTER'],
        'school_year'       => $row['SCHOOL_YEAR'],
        'section'           => $row['COURSE_ID'] . ' ' . $row['YEAR_LEVEL'] . '-' . $row['SECTION'],
        'status'            => $row['REGISTRATION_TITLE'],
        'enrollment_status' => $row['DATE_ENROLLED'] ? 'ENROLLED' : 'NOT ENROLLED',
        'gwa'               => '1.75', 
        
        // Progress Data (From View)
        'units_total'       => $total,
        'units_academic'    => $acad,
        'units_non_academic'=> $non_acad,
        'progress_percent'  => $percent
    ];

    echo json_encode(['success' => true, 'data' => $data]);
} else {
    echo json_encode(['success' => false, 'message' => 'Student not found in database']);
}

// 5. CLEAN UP
oci_free_statement($stid);
oci_free_statement($p_cursor); 
oci_close($conn);
?>