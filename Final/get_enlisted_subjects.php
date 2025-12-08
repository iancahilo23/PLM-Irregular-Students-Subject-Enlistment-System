<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['student_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$student_id = $_SESSION['student_id'];

require 'db_conn.php';  // Oracle DB connection

//------------------------------------------------------
// 1. Get current semester & school year from STUDENT
//------------------------------------------------------
$sql_sem = "SELECT SEMESTER, SCHOOL_YEAR
            FROM STUDENT
            WHERE STUDENT_ID = :student_id";

$stid_sem = oci_parse($conn, $sql_sem);
oci_bind_by_name($stid_sem, ':student_id', $student_id);
oci_execute($stid_sem);

$row_sem = oci_fetch_assoc($stid_sem);

if (!$row_sem) {
    echo json_encode(['success' => false, 'message' => 'Student not found']);
    exit;
}

$current_semester = $row_sem['SEMESTER'];
$current_school_year = $row_sem['SCHOOL_YEAR'];

oci_free_statement($stid_sem);

//------------------------------------------------------
// 2. Get enlisted subjects for this semester & school year
//------------------------------------------------------
$sql = "SELECT
            se.subject_id,
            se.section_id,
            se.day_of_week
        FROM student_enlistment se
        WHERE se.student_id = :student_id
          AND se.semester = :semester
          AND se.school_year = :school_year";

$stid = oci_parse($conn, $sql);

oci_bind_by_name($stid, ':student_id', $student_id);
oci_bind_by_name($stid, ':semester', $current_semester);
oci_bind_by_name($stid, ':school_year', $current_school_year);

oci_execute($stid);

//------------------------------------------------------
// 3. Build response
//------------------------------------------------------
$enlisted = [];

while ($row = oci_fetch_assoc($stid)) {
    $enlisted[] = [
        'subject_id' => $row['SUBJECT_ID'],
        'section_id' => $row['SECTION_ID'],
        'day'        => $row['DAY_OF_WEEK'],
        'display'    => $row['SUBJECT_ID'] . ' - ' . $row['SECTION_ID']
    ];
}

oci_free_statement($stid);
oci_close($conn);

//------------------------------------------------------
// 4. Output JSON
//------------------------------------------------------
echo json_encode([
    'success' => true,
    'semester' => $current_semester,
    'school_year' => $current_school_year,
    'enlistedSubjects' => $enlisted
]);
