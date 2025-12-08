<?php
// c:\xampp\htdocs\plm_portal\get_student_data.php

session_start();

// Turn off error display, but log errors internally if needed
error_reporting(0);
ini_set('display_errors', 0);

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header('Content-Type: application/json');

require_once 'db_conn.php';

// Clear output buffer to prevent any accidental output before JSON
if (ob_get_length()) {
    ob_clean();
}

// Check if logged in
if (!isset($_SESSION['student_id'])) {
    echo json_encode(['success' => false, 'message' => 'No user logged in']);
    exit;
}

$student_id = $_SESSION['student_id'];

// Prepare and execute Oracle stored procedure with cursor
$sql = "BEGIN GET_STUDENT_DASHBOARD(:id, :cursor_ptr); END;";
$stid = oci_parse($conn, $sql);
$p_cursor = oci_new_cursor($conn);

oci_bind_by_name($stid, ":id", $student_id);
oci_bind_by_name($stid, ":cursor_ptr", $p_cursor, -1, OCI_B_CURSOR);

if (!oci_execute($stid)) {
    $e = oci_error($stid);
    // ★ ADD THIS LINE for clearer debugging
    $last_error = error_get_last();
    echo json_encode(['success' => false, 'message' => 'Procedure Failed: ' . $e['message'] . ' | PHP Error: ' . ($last_error['message'] ?? 'None')]);
    exit;
}

if (!oci_execute($p_cursor)) {
    $e = oci_error($p_cursor);
    // ★ ADD THIS LINE for clearer debugging
    $last_error = error_get_last();
    echo json_encode(['success' => false, 'message' => 'Cursor Failed: ' . $e['message'] . ' | PHP Error: ' . ($last_error['message'] ?? 'None')]);
    exit;
}

$row = oci_fetch_assoc($p_cursor);

if ($row) {
    // Prepare data (same logic you had)
    $program_full = $row['COURSE_TITLE'] ?? $row['COURSE_ID'];
    $course_id = trim($row['COURSE_ID']);

    $db_college = $row['college_title'] ?? $row['college'] ?? $row['COLLEGE_TITLE'] ?? $row['COLLEGE'] ?? null;

    if (!empty($db_college) && !in_array($db_college, ['No College Assigned', 'No College Found'])) {
        $college = $db_college;
    } else {
        $college = "Unknown College";

        if (stripos($course_id, 'BSIT') !== false || stripos($course_id, 'BSCS') !== false) {
            $college = "College of Information Systems and Technology Management";
        } elseif (stripos($course_id, 'BSA') !== false) {
            $college = "College of Accountancy";
        } elseif (stripos($course_id, 'BS Arch') !== false) {
            $college = "College of Architecture and Sustainable Built Environments";
        } elseif (stripos($course_id, 'BSBA') !== false || stripos($course_id, 'BSE') !== false) {
            $college = "College of Business Administration";
        } elseif (stripos($course_id, 'BS CE') !== false || stripos($course_id, 'BS ME') !== false) {
            $college = "College of Engineering";
        } elseif (stripos($course_id, 'BS PT') !== false) {
            $college = "College of Physical Therapy";
        } elseif (stripos($course_id, 'BS N') !== false) {
            $college = "College of Nursing";
        }
    }

    if (!empty($row['REGISTRATION_TITLE'])) {
        $status_display = $row['REGISTRATION_TITLE'];
    } elseif (($row['REGISTRATION_ID'] ?? '') == 'IRR') {
        $status_display = 'Irregular';
    } else {
        $status_display = 'Regular';
    }

    $enrollment_display = !empty($row['DATE_ENROLLED']) ? 'ENROLLED' : 'NOT ENROLLED';

    $acad_units = isset($row['ACADEMIC_UNITS']) ? floatval($row['ACADEMIC_UNITS']) : 0;
    $non_acad_units = isset($row['NON_ACADEMIC_UNITS']) ? floatval($row['NON_ACADEMIC_UNITS']) : 0;
    $total_units = $acad_units + $non_acad_units;

    $max_units = 180;
    $progress_percent = $total_units > 0 ? ($total_units / $max_units) * 100 : 0;
    if ($progress_percent > 100) $progress_percent = 100;

    $data = [
        'student_id' => $row['STUDENT_ID'],
        'first_name' => $row['FIRSTNAME'],
        'last_name'  => $row['LASTNAME'],
        'program'    => $program_full,
        'college'    => $college,
        'year_level' => $row['YEAR_LEVEL'],
        'semester'   => $row['SEMESTER'],
        'section'    => $row['COURSE_ID'] . ' ' . $row['YEAR_LEVEL'] . '-' . $row['SECTION'],
        'school_year'=> $row['SCHOOL_YEAR'],
        'email'      => strtolower($row['FIRSTNAME'] . '.' . $row['LASTNAME'] . '@plm.edu.ph'),
        'status'     => $status_display,
        'enrollment_status' => $enrollment_display,
        'gwa'        => '1.75',
        'units_total'=> $total_units,
        'units_academic' => $acad_units,
        'units_non_academic' => $non_acad_units,
        'progress_percent' => round($progress_percent)
    ];

    echo json_encode(['success' => true, 'data' => $data]);
} else {
    echo json_encode(['success' => false, 'message' => 'Student not found']);
}

// Clean up
oci_free_statement($stid);
oci_free_statement($p_cursor);
oci_close($conn);

exit;  // Ensure nothing after this outputs
