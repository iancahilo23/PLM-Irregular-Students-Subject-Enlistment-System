<?php
// enlistment.php - WITH FUNCTIONAL SLOTS

include 'db_conn.php';

if (!isset($conn)) {
    http_response_code(500);
    exit;
}

session_start();
if (!isset($_SESSION['student_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$student_id = $_SESSION['student_id'];
$course_filter = $_GET['course_filter'] ?? 'ALL';

// Get current semester and school year
$sql_sem = "SELECT SEMESTER, SCHOOL_YEAR FROM STUDENT WHERE STUDENT_ID = :student_id";
$stid_sem = oci_parse($conn, $sql_sem);
oci_bind_by_name($stid_sem, ':student_id', $student_id);
oci_execute($stid_sem);
$sem_row = oci_fetch_assoc($stid_sem);
oci_free_statement($stid_sem);

if (!$sem_row) {
    echo json_encode(['success' => false, 'message' => 'Could not determine semester']);
    oci_close($conn);
    exit;
}

$current_semester = $sem_row['SEMESTER'];
$current_school_year = $sem_row['SCHOOL_YEAR'];

// ⭐ UPDATED QUERY: Now includes enrollment count and max slots
$sql_select = "
    SELECT
        v.SUBJECT_CODE AS code,
        v.SUBJECT_TITLE AS description,
        v.SECTION AS section,
        v.UNITS AS units,
        v.TIME_START || ' - ' || v.TIME_END AS time_range,
        v.DAY_OF_WEEK AS day_of_week,
        v.FACULTY_LASTNAME AS faculty_lastname,
        v.FACULTY_FIRSTNAME AS faculty_firstname,
        v.COURSE_ID as course_id,
        s.MAX_SLOTS AS max_slots,
        (
            SELECT COUNT(*)
            FROM STUDENT_ENLISTMENT se
            WHERE se.SUBJECT_ID = v.SUBJECT_CODE
            AND se.SECTION = v.SECTION
            AND se.SEMESTER = :semester
            AND se.SCHOOL_YEAR = :school_year
            AND se.ENROLL_ID IN ('PEN', 'ENR')
        ) AS enrolled_count
    FROM VW_CISTM_SUBJECTS v
    JOIN SUBJECT s ON v.SUBJECT_CODE = s.SUBJECT_ID AND v.SECTION = s.SECTION
";

$where_clause = "";
if ($course_filter !== 'ALL') {
    $where_clause = " WHERE (v.COURSE_ID = :course_filter OR v.COURSE_ID = 'COMMON') ";
}

$sql = $sql_select . $where_clause . " ORDER BY v.SUBJECT_CODE, v.SECTION";

$stmt = oci_parse($conn, $sql);
if (!$stmt) {
    $e = oci_error($conn);
    echo json_encode(["success" => false, "message" => "SQL Parse Error: " . $e['message']]);
    oci_close($conn);
    exit;
}

// Bind semester/year for the enrollment count subquery
oci_bind_by_name($stmt, ":semester", $current_semester);
oci_bind_by_name($stmt, ":school_year", $current_school_year);

if ($where_clause !== "") {
    oci_bind_by_name($stmt, ":course_filter", $course_filter);
}

if (!oci_execute($stmt)) {
    $e = oci_error($stmt);
    echo json_encode(["success" => false, "message" => "SQL Execute Error: " . $e['message']]);
    oci_close($conn);
    exit;
}

// Process results and calculate available slots
$subjects = [];
$subject_map = [];

while ($row = oci_fetch_assoc($stmt)) {
    $row = array_change_key_case($row, CASE_LOWER);
    $unique_key = $row['code'] . '-' . $row['section'];

    if (!isset($subject_map[$unique_key])) {
        // Calculate available slots
        $max = isset($row['max_slots']) && $row['max_slots'] !== null ? (int)$row['max_slots'] : 40;
        $enrolled = isset($row['enrolled_count']) ? (int)$row['enrolled_count'] : 0;
        $available = $max - $enrolled;

        // Ensure available doesn't go negative
        if ($available < 0) $available = 0;

        $subject_map[$unique_key] = [
            'code' => $row['code'],
            'section' => (int)$row['section'],
            'units' => (float)$row['units'],
            'description' => $row['description'],
            'course_id' => $row['course_id'],
            'schedule_parts' => [],
            'faculty' => $row['faculty_lastname'] . ', ' . $row['faculty_firstname'],
            'slots' => $available . '/' . $max,           // "30/40"
            'available_slots' => $available,               // 30
            'max_slots' => $max,                          // 40
            'room' => 'TBA'
        ];
    }

    if ($row['day_of_week'] && $row['time_range']) {
        $subject_map[$unique_key]['schedule_parts'][] = $row['day_of_week'] . ' ' . $row['time_range'];
    }
}

foreach ($subject_map as $key => $sub) {
    $sub['schedule'] = implode(' / ', $sub['schedule_parts']);
    unset($sub['schedule_parts']);
    $subjects[] = $sub;
}

header('Content-Type: application/json');
echo json_encode(["success" => true, "subjects" => $subjects]);

oci_free_statement($stmt);
oci_close($conn);
?>