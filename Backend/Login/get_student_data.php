<?php
// c:\xampp\htdocs\plm_portal\get_student_data.php

session_start(); 

// 1. SETTINGS & HEADERS
error_reporting(0);
ini_set('display_errors', 0);
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header('Content-Type: application/json');

// 2. CONNECT TO DATABASE
require_once 'db_conn.php'; 

// 3. CHECK LOGIN
if (!isset($_SESSION['student_id'])) {
    echo json_encode(['success' => false, 'message' => 'No user logged in']);
    exit;
}

$student_id = $_SESSION['student_id'];

// 4. SQL QUERY (Using JOIN to get the Full Course Title)
// We join the STUDENT table with the COURSE table using COURSE_ID
$sql = "SELECT s.*, c.COURSE_TITLE 
        FROM STUDENT s 
        LEFT JOIN COURSE c ON s.COURSE_ID = c.COURSE_ID 
        WHERE s.STUDENT_ID = :id";

$stid = oci_parse($conn, $sql);
oci_bind_by_name($stid, ":id", $student_id);

if (!oci_execute($stid)) {
    $e = oci_error($stid);
    echo json_encode(['success' => false, 'message' => 'Query Failed: ' . $e['message']]);
    exit;
}

$row = oci_fetch_assoc($stid);

if ($row) {
    // 5. PREPARE VARIABLES
    
    // A. Program Name: Use the Title from DB, or fallback to Code if missing
    $program_full = $row['COURSE_TITLE'] ? $row['COURSE_TITLE'] : $row['COURSE_ID'];

    // B. College Name: Logic matching your College Table screenshot
    $course_id = trim($row['COURSE_ID']);
    $college = "Unknown College";

    // Matching logic based on COLLEGE table IDs
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

// 2. DYNAMIC STATUS (Based on REGISTRATION_ID)
    // If DB says 'IRR', show 'Irregular'. Else show 'Regular'.
    $status_display = ($row['REGISTRATION_ID'] == 'IRR') ? 'Irregular' : 'Regular';

    // 3. DYNAMIC ENROLLMENT (Based on DATE_ENROLLED)
    // If date is not empty, they are Enrolled.
    $enrollment_display = (!empty($row['DATE_ENROLLED'])) ? 'ENROLLED' : 'NOT ENROLLED';

    // 4. PREPARE DATA
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
        'gwa'               => '1.75'               // Still Hardcoded (Column missing in DB)
    ];

    echo json_encode(['success' => true, 'data' => $data]);
} else {
    echo json_encode(['success' => false, 'message' => 'Student not found']);
}

oci_free_statement($stid);
oci_close($conn);
?>