<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['student_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$student_id = $_SESSION['student_id'];

require 'db_conn.php';  // your Oracle DB connection script

// Get current semester and school year from STUDENT table
$sql_sem = "SELECT SEMESTER, SCHOOL_YEAR FROM STUDENT WHERE STUDENT_ID = :student_id";
$stid_sem = oci_parse($conn, $sql_sem);
oci_bind_by_name($stid_sem, ':student_id', $student_id);
oci_execute($stid_sem);
$sem_row = oci_fetch_assoc($stid_sem);
oci_free_statement($stid_sem);

if (!$sem_row) {
    echo json_encode(['success' => false, 'message' => 'Could not determine current semester']);
    oci_close($conn);
    exit;
}

$current_semester = $sem_row['SEMESTER'];
$current_school_year = $sem_row['SCHOOL_YEAR'];

// Fetch enlisted/enrolled subjects for this student, semester, and school year
$sql = "SELECT SUBJECT_ID, SECTION FROM STUDENT_ENLISTMENT
        WHERE STUDENT_ID = :student_id
        AND SEMESTER = :semester
        AND SCHOOL_YEAR = :school_year
        AND ENROLL_ID IN ('PEN', 'APPROVED')";

$stid = oci_parse($conn, $sql);
oci_bind_by_name($stid, ':student_id', $student_id);
oci_bind_by_name($stid, ':semester', $current_semester);
oci_bind_by_name($stid, ':school_year', $current_school_year);
oci_execute($stid);

$enlisted = [];
while ($row = oci_fetch_assoc($stid)) {
    $enlisted[] = $row['SUBJECT_ID'] . '-' . $row['SECTION'];
}

oci_free_statement($stid);
oci_close($conn);

echo json_encode(['success' => true, 'enlistedSubjects' => $enlisted]);
