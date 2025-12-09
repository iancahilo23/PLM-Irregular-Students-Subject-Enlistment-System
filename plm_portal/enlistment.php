<?php
// enlistment.php - Filter logic simplified using the Oracle VIEW

include 'db_conn.php';

if (!isset($conn)) {
    http_response_code(500);
    exit;
}

$course_filter = $_GET['course_filter'] ?? 'ALL';
$where_clause = "";

// In enlistment.php

// 1. Base Query uses the VIEW
$sql_select = "
    SELECT
        SUBJECT_CODE AS code,
        SUBJECT_TITLE AS description,
        SECTION AS section,
        UNITS AS units,
        TIME_START || ' - ' || TIME_END AS time_range,
        DAY_OF_WEEK AS day_of_week,
        FACULTY_LASTNAME AS faculty_lastname,
        FACULTY_FIRSTNAME AS faculty_firstname,
        COURSE_ID as course_id,
        TAKEN_SLOTS as taken_slots,  /* <--- ADD THIS LINE */
        MAX_SLOTS as max_slots       /* <--- ADD THIS LINE */
    FROM VW_CISTM_SUBJECTS
";

// 2. Dynamic WHERE clause
if ($course_filter !== 'ALL') {
    // Show specific course subjects OR common subjects
    $where_clause = " WHERE (COURSE_ID = :course_filter OR COURSE_ID = 'COMMON') ";
} else {
    $where_clause = "";
}

// 3. Combine parts
$sql = $sql_select . $where_clause . " ORDER BY SUBJECT_CODE, SECTION";

// 3. Combine parts
$sql = $sql_select . $where_clause . " ORDER BY SUBJECT_CODE, SECTION"; // Fixed sorting column names

// 4. Execute the Query
$stmt = oci_parse($conn, $sql);
if (!$stmt) {
    $e = oci_error($conn);
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "message" => "SQL Parse Error: " . $e['message']]);
    oci_close($conn);
    exit;
}

if ($where_clause !== "") {
    oci_bind_by_name($stmt, ":course_filter", $course_filter);
}

$r = oci_execute($stmt);
if (!$r) {
    $e = oci_error($stmt);
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "message" => "SQL Execute Error: " . $e['message']]);
    oci_close($conn);
    exit;
}

// 5. Fetch all rows and process (unchanged logic)
$subjects = [];
$subject_map = [];

while ($row = oci_fetch_assoc($stmt)) {
    $row = array_change_key_case($row, CASE_LOWER);
    $unique_key = $row['code'] . '-' . $row['section'];

    // Dynamic Slot Calculation
    $taken = isset($row['taken_slots']) ? (int)$row['taken_slots'] : 0;
    $max   = isset($row['max_slots']) ? (int)$row['max_slots'] : 40;
    $slots_display = $taken . '/' . $max; // Format: "Taken/Max" (e.g., 5/40)

    if (!isset($subject_map[$unique_key])) {
        $subject_map[$unique_key] = [
            'code' => $row['code'],
            'section' => (int)$row['section'],
            'units' => (float)$row['units'],
            'description' => $row['description'],
            'course_id' => $row['course_id'],
            'schedule_parts' => [],
            'faculty' => $row['faculty_lastname'] . ', ' . $row['faculty_firstname'],
            'slots' => $slots_display, // <--- UPDATED THIS LINE
            'taken_slots' => $taken,   // <--- Added for JS calculation
            'max_slots' => $max,       // <--- Added for JS calculation
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