<?php
// enlistment.php - UPDATED SQL QUERY

// Include the Oracle connection setup
include 'db_conn.php';


$sql = "
    SELECT
        s.subject_id AS code,
        s.subject_title AS description,
        s.section AS section,
        s.units AS units,
        TO_CHAR(sch.time_start, 'HH24:MI') || ' - ' || TO_CHAR(sch.time_end, 'HH24:MI') AS time_range,
        sch.day_of_week AS day_of_week,
        f.lastname AS faculty_lastname,
        f.firstname AS faculty_firstname,
        -- ★ CRITICAL FIELD: Used by JS for filtering
        CASE
            WHEN s.subject_id LIKE 'EIT%' OR s.subject_id LIKE 'ICC%' THEN 'BSIT'
            WHEN s.subject_id LIKE 'CET%' THEN 'BSCS'
            ELSE 'GENERAL' -- Catch-all for non-IT/CS subjects (like STS, AAP, PCM, etc.)
        END AS course_id
    FROM subject s
    LEFT JOIN schedule_option so ON s.sched_option_id = so.sched_option_id
    LEFT JOIN schedule sch ON so.sched_id = sch.sched_id
    LEFT JOIN faculty f ON so.faculty_id = f.faculty_id
    ORDER BY s.subject_id, s.section, sch.day_of_week
";

// 4. Execute the Query
$stmt = oci_parse($conn, $sql);
if (!$stmt) {
    $e = oci_error($conn);
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "message" => "SQL Parse Error: " . $e['message']]);
    oci_close($conn);
    exit;
}

$r = oci_execute($stmt);
if (!$r) {
    $e = oci_error($stmt);
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "message" => "SQL Execute Error: " . $e['message']]);
    oci_close($conn);
    exit;
}

// 5. Fetch all rows and process
$subjects = [];
$subject_map = []; // Map to group schedules by subject_id and section

while ($row = oci_fetch_assoc($stmt)) {
    // Convert all column names to lowercase for consistency
    $row = array_change_key_case($row, CASE_LOWER);

    $unique_key = $row['code'] . '-' . $row['section'];

    // Check if we've already started collecting data for this subject
    if (!isset($subject_map[$unique_key])) {
        // Initialize the entry
        $subject_map[$unique_key] = [
            'code' => $row['code'],
            'section' => (int)$row['section'],
            'units' => (float)$row['units'],
            'description' => $row['description'],
            // Start building the schedule string
            'schedule_parts' => [],
            // Faculty name (assuming one faculty per sched_option_id for a subject/section combo)
            'faculty' => $row['faculty_lastname'] . ', ' . $row['faculty_firstname'],
            // Placeholder - the database has no 'slots' column, so we'll use a dummy value
            'slots' => '30/40',
            'room' => 'TBA' // Placeholder, as room table is missing
        ];
    }

    // Add the schedule part (Day/Time)
    if ($row['day_of_week'] && $row['time_range']) {
        $subject_map[$unique_key]['schedule_parts'][] = $row['day_of_week'] . ' ' . $row['time_range'];
    }
}

// Final processing: create the consolidated schedule string
foreach ($subject_map as $key => $sub) {
    $sub['schedule'] = implode(' / ', $sub['schedule_parts']);
    unset($sub['schedule_parts']); // Remove temporary array
    $subjects[] = $sub;
}

// 6. Return the JSON response
header('Content-Type: application/json');
echo json_encode(["success" => true, "subjects" => $subjects]);

// 7. Clean up
oci_free_statement($stmt);
oci_close($conn);
?>