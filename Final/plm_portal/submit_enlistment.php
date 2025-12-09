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

// --- 1. Get Current Semester/Year ---
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

// --- 2. Fetch Existing Subjects (To skip duplicates) ---
$sql_existing = "SELECT SUBJECT_ID, SECTION FROM STUDENT_ENLISTMENT
                 WHERE STUDENT_ID = :student_id
                 AND SEMESTER = :semester
                 AND SCHOOL_YEAR = :school_year
                 AND ENROLL_ID IN ('PEN', 'ENR')";
$stid_exist = oci_parse($conn, $sql_existing);
oci_bind_by_name($stid_exist, ':student_id', $student_id);
oci_bind_by_name($stid_exist, ':semester', $current_semester);
oci_bind_by_name($stid_exist, ':school_year', $current_school_year);
oci_execute($stid_exist);

$existingSubjects = [];
while ($row = oci_fetch_assoc($stid_exist)) {
    $existingSubjects[] = $row['SUBJECT_ID'] . '-' . $row['SECTION'];
}
oci_free_statement($stid_exist);

// --- 3. Prepare Insertion Statement ---
$insert_sql = "INSERT INTO STUDENT_ENLISTMENT (STUDENT_ID, SUBJECT_ID, SECTION, SEMESTER, SCHOOL_YEAR, ENROLL_ID)
               VALUES (:student_id, :subject_id, :section, :semester, :school_year, 'PEN')";
$stid_insert = oci_parse($conn, $insert_sql);

$subject_code_ref = null;
$section_ref = null;

oci_bind_by_name($stid_insert, ':student_id', $student_id);
oci_bind_by_name($stid_insert, ':semester', $current_semester);
oci_bind_by_name($stid_insert, ':school_year', $current_school_year);
oci_bind_by_name($stid_insert, ':subject_id', $subject_code_ref, 20);
oci_bind_by_name($stid_insert, ':section', $section_ref, 10);

$addedCount = 0;

// --- 4. Loop and Insert with Slot Validation ---
foreach ($data['subjects'] as &$subj) {
    if (!isset($subj['code']) || !isset($subj['section'])) {
        continue;
    }

    $uniqueId = $subj['code'] . '-' . $subj['section'];
    if (in_array($uniqueId, $existingSubjects)) {
        continue; // Skip duplicates
    }

    // ⭐ CHECK IF SLOTS ARE AVAILABLE
    $check_sql = "
        SELECT
            NVL(s.MAX_SLOTS, 40) AS max_slots,
            (SELECT COUNT(*)
             FROM STUDENT_ENLISTMENT se
             WHERE se.SUBJECT_ID = :subj_code
             AND se.SECTION = :section
             AND se.SEMESTER = :semester
             AND se.SCHOOL_YEAR = :school_year
             AND se.ENROLL_ID IN ('PEN', 'ENR')) AS enrolled
        FROM SUBJECT s
        WHERE s.SUBJECT_ID = :subj_code2
        AND s.SECTION = :section2
    ";

    $check_stid = oci_parse($conn, $check_sql);
    oci_bind_by_name($check_stid, ':subj_code', $subj['code']);
    oci_bind_by_name($check_stid, ':section', $subj['section']);
    oci_bind_by_name($check_stid, ':semester', $current_semester);
    oci_bind_by_name($check_stid, ':school_year', $current_school_year);
    oci_bind_by_name($check_stid, ':subj_code2', $subj['code']);
    oci_bind_by_name($check_stid, ':section2', $subj['section']);

    oci_execute($check_stid);
    $slot_data = oci_fetch_assoc($check_stid);
    oci_free_statement($check_stid);

    if ($slot_data) {
        $max_slots = isset($slot_data['MAX_SLOTS']) ? (int)$slot_data['MAX_SLOTS'] : 40;
        $enrolled = isset($slot_data['ENROLLED']) ? (int)$slot_data['ENROLLED'] : 0;
        $available = $max_slots - $enrolled;

        if ($available <= 0) {
            echo json_encode([
                'success' => false,
                'message' => "Subject {$subj['code']} Section {$subj['section']} is full (0/{$max_slots} slots available)."
            ]);
            oci_free_statement($stid_insert);
            oci_close($conn);
            exit;
        }
    }

    // Update the reference variables for insertion
    $subject_code_ref = $subj['code'];
    $section_ref = $subj['section'];

    // Execute the insert statement
    $r = oci_execute($stid_insert);

    if (!$r) {
        $e = oci_error($stid_insert);
        echo json_encode(['success' => false, 'message' => "Insertion Failed for {$subject_code_ref}. Database error: " . $e['message']]);
        oci_free_statement($stid_insert);
        oci_close($conn);
        exit;
    }
    $addedCount++;
}

// --- 5. Clean Up and Success Response ---
oci_commit($conn);
oci_free_statement($stid_insert);
oci_close($conn);

echo json_encode([
    'success' => true,
    'message' => "Successfully enlisted {$addedCount} new subject(s). Status: PENDING"
]);
?>