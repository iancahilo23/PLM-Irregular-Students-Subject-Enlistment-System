<?php
// enlistment.php - Filter logic simplified using the Oracle VIEW

include 'db_conn.php';

if (!isset($conn)) {
    http_response_code(500);
    exit;
}

$course_filter = $_GET['course_filter'] ?? 'ALL';
$where_clause = "";

// 1. Base Query uses the VIEW and joins the new centralized capacity table
$sql_select = "
    SELECT
        V.SUBJECT_CODE AS code,
        V.SUBJECT_TITLE AS description,
        V.SECTION AS section,
        V.UNITS AS units,
        V.TIME_START || ' - ' || V.TIME_END AS time_range,
        V.DAY_OF_WEEK AS day_of_week,
        V.FACULTY_LASTNAME AS faculty_lastname,
        V.FACULTY_FIRSTNAME AS faculty_firstname,
        V.COURSE_ID as course_id,
        -- ★ FIX: Fetch dynamic slot data from the master capacity table
        SSC.FILLED_SLOTS AS filled_slots,
        SSC.TOTAL_SLOTS AS total_slots
    FROM VW_CISTM_SUBJECTS V
    -- ★ FIX: Join the user's centralized subject_section_capacity table
    LEFT JOIN subject_section_capacity SSC ON V.SUBJECT_CODE = SSC.SUBJECT_ID
        AND V.SECTION = SSC.SECTION_ID
";

// 2. Dynamic WHERE clause
if ($course_filter !== 'ALL') {
    // Show specific course subjects OR common subjects
    $where_clause = " WHERE (V.COURSE_ID = :course_filter OR V.COURSE_ID = 'COMMON') ";
} else {
    $where_clause = "";
}

// 3. Combine parts
$sql = $sql_select . $where_clause . " ORDER BY V.SUBJECT_CODE, V.SECTION";

// 4. Execute the Query
$stmt = oci_parse($conn, $sql);
// ... (error handling for parse and execute unchanged) ...

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

// 5. Fetch all rows and process (FIXED SLOT LOGIC)
$subjects = [];
$subject_map = [];

while ($row = oci_fetch_assoc($stmt)) {
    $row = array_change_key_case($row, CASE_LOWER);
    $unique_key = $row['code'] . '-' . $row['section'];

    if (!isset($subject_map[$unique_key])) {
        // Initialize map entry for this section
        // Since the join is only on Subject+Section, the slot data is now the single, centralized capacity.
        $filled = $row['filled_slots'] !== null ? (int)$row['filled_slots'] : 0;
        $total = $row['total_slots'] !== null ? (int)$row['total_slots'] : 40;

        // Dynamic slot string generation (e.g., "1/40")
        $slots_string = "{$filled}/{$total}";

        $subject_map[$unique_key] = [
            'code' => $row['code'],
            'section' => (int)$row['section'],
            'units' => (float)$row['units'],
            'description' => $row['description'],
            'course_id' => $row['course_id'],
            'schedule_parts' => [],
            'faculty' => $row['faculty_lastname'] . ', ' . $row['faculty_firstname'],
            'slots' => $slots_string, // DYNAMICALLY SET
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