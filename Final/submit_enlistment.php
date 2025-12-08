<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['student_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in (Session check failed)']);
    exit;
}

$student_id = $_SESSION['student_id'];

// Read JSON input
$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['subjects']) || !is_array($data['subjects'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid input data']);
    exit;
}

require 'db_conn.php';


// ===============================================================
// 1. Get Current Semester and School Year
// ===============================================================
$sql_sem = "SELECT SEMESTER, SCHOOL_YEAR
            FROM STUDENT
            WHERE STUDENT_ID = :student_id";

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


// ===============================================================
// 2. Fetch Existing Enlistments (avoid duplicates)
// ===============================================================
$sql_existing = "
    SELECT SUBJECT_ID, SECTION_ID, DAY_OF_WEEK
    FROM STUDENT_ENLISTMENT
    WHERE STUDENT_ID = :student_id
      AND SEMESTER = :semester
      AND SCHOOL_YEAR = :school_year
      AND ENROLL_ID IN ('PEN', 'APPROVED')
";

$stid_exist = oci_parse($conn, $sql_existing);
oci_bind_by_name($stid_exist, ':student_id', $student_id);
oci_bind_by_name($stid_exist, ':semester', $current_semester);
oci_bind_by_name($stid_exist, ':school_year', $current_school_year);
oci_execute($stid_exist);

$existingSubjects = [];
while ($row = oci_fetch_assoc($stid_exist)) {
    $existingSubjects[] = $row['SUBJECT_ID'] . '-' . $row['SECTION_ID'] . '-' . $row['DAY_OF_WEEK'];
}
oci_free_statement($stid_exist);


// ===============================================================
// 3. Prepare Insert Statement
// ===============================================================
$insert_sql = "
    INSERT INTO STUDENT_ENLISTMENT
    (STUDENT_ID, SUBJECT_ID, SECTION_ID, DAY_OF_WEEK, SEMESTER, SCHOOL_YEAR, ENROLL_ID)
    VALUES
    (:student_id, :subject_id, :section_id, :day_of_week, :semester, :school_year, 'PEN')
";

$stid_insert = oci_parse($conn, $insert_sql);

oci_bind_by_name($stid_insert, ':student_id', $student_id);
oci_bind_by_name($stid_insert, ':semester', $current_semester);
oci_bind_by_name($stid_insert, ':school_year', $current_school_year);

// dynamic variables updated per loop
$subject_code_ref = null;
$section_id_ref = null;
$day_ref = null;

oci_bind_by_name($stid_insert, ':subject_id', $subject_code_ref, 50);
oci_bind_by_name($stid_insert, ':section_id', $section_id_ref, 20);
oci_bind_by_name($stid_insert, ':day_of_week', $day_ref, 5);

$addedCount = 0;


// ===============================================================
// 4. Loop through selected subjects and insert them
// ===============================================================
foreach ($data['subjects'] as $subj) {

    if (!isset($subj['code'], $subj['section'], $subj['day'])) {
        continue;
    }

    $uniqueId = $subj['code'] . '-' . $subj['section'] . '-' . $subj['day'];
    if (in_array($uniqueId, $existingSubjects)) {
        continue; // avoid duplicates
    }

    // update values
    $subject_code_ref = $subj['code'];
    $section_id_ref = $subj['section'];
    $day_ref = $subj['day'];

    $r = oci_execute($stid_insert);

    if (!$r) {
        $e = oci_error($stid_insert);
        echo json_encode([
            'success' => false,
            'message' => "Insertion failed for {$subject_code_ref}. Error: " . $e['message']
        ]);
        oci_free_statement($stid_insert);
        oci_close($conn);
        exit;
    }

    $addedCount++;
}


// ===============================================================
// 5. Commit and respond
// ===============================================================
oci_commit($conn);
oci_free_statement($stid_insert);
oci_close($conn);

echo json_encode([
    'success' => true,
    'message' => "Successfully enlisted {$addedCount} new subject(s). Status: PENDING"
]);
?>
