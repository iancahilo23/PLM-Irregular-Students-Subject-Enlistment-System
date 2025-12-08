<?php
// student_profile.php
header('Content-Type: application/json');
include 'db_conn.php';

// Check if connection was successful
if (!isset($conn)) {
    http_response_code(500);
    exit;
}

// ★ NEW: Get the Student ID from the URL Query Parameter (GET request)
$student_id = $_GET['student_id'] ?? null;

if (empty($student_id)) {
    echo json_encode(["success" => false, "message" => "Missing student ID in request."]);
    oci_close($conn);
    exit;
}

// Prepare the SQL Query
$sql = "
    SELECT
        s.student_id,
        s.lastname,
        s.firstname,
        s.middlename,
        s.year_level,
        s.semester,
        s.school_year,
        c.course_title,
        col.college_title,
        rs.registration_title AS status
    FROM STUDENT s
    JOIN COURSE c ON s.course_id = c.course_id
    JOIN COLLEGE col ON c.college_id = col.college_id
    JOIN REGISTRATION_STATUS rs ON s.registration_id = rs.registration_id
    WHERE s.student_id = :id
";

// Execute the Query
$stmt = oci_parse($conn, $sql);
oci_bind_by_name($stmt, ":id", $student_id);

if (!$stmt || !oci_execute($stmt)) {
    $e = oci_error($conn) ?: oci_error($stmt);
    echo json_encode(["success" => false, "message" => "SQL Error: " . $e['message']]);
    oci_close($conn);
    exit;
}

// Fetch the data
if ($row = oci_fetch_assoc($stmt)) {
    // Format the data for JSON response
    $profile = [
        'success' => true,
        'student_id' => $row['STUDENT_ID'],
        'full_name' => trim($row['LASTNAME'] . ', ' . $row['FIRSTNAME'] . ' ' . $row['MIDDLENAME']),
        'program' => $row['COURSE_TITLE'],
        'year_level' => $row['YEAR_LEVEL'],
        'semester_sy' => $row['SEMESTER'] . ' Semester, ' . $row['SCHOOL_YEAR'],
        'status' => $row['STATUS']
    ];
    echo json_encode($profile);
} else {
    // No data found for the ID
    echo json_encode(["success" => false, "message" => "Student ID {$student_id} not found."]);
}

// Clean up
oci_free_statement($stmt);
oci_close($conn);
?>