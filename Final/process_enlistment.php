<?php
// process_enlistment.php - Handles the final submission and validation

header('Content-Type: application/json');

include 'db_conn.php';
include 'max_units.php'; // Include the file with the get_max_units_php function

if (!isset($conn)) {
    echo json_encode(["success" => false, "message" => "Database connection failed."]);
    exit;
}

// --- 1. Retrieve Submitted Data ---
// You will need to receive this data from your frontend AJAX request
$data = json_decode(file_get_contents("php://input"), true);
$student_id = $data['student_id'] ?? null;
$selected_subjects = $data['selected_subjects'] ?? [];

if (empty($student_id) || empty($selected_subjects)) {
    echo json_encode(["success" => false, "message" => "Missing data in submission."]);
    oci_close($conn);
    exit;
}

// --- 2. Calculate Total Submitted Units (Placeholder - YOU MUST IMPLEMENT THIS) ---
// This is the critical part: you must query the database to sum the units for the subject codes in $selected_subjects
$total_selected_units = 25; // **TEMPORARY PLACEHOLDER**

// --- 3. Get Dynamic Max Unit Limit (The IF-ELSE Check) ---
$max_allowed_units = get_max_units_php($conn, $student_id);

// --- 4. Server-Side Validation Check ---
if ($total_selected_units > $max_allowed_units) {
    echo json_encode([
        "success" => false,
        "message" => "Enrollment failed. Your total units (**" . $total_selected_units . "**) exceeds your allowed limit of **" . $max_allowed_units . "** units."
    ]);
    oci_close($conn);
    exit;
}

// --- 5. Success: Proceed with Enrollment ---
// **Place your OCI INSERT/UPDATE statements here to finalize the enrollment**

echo json_encode([
    "success" => true,
    "message" => "Enlistment successful! Validation passed."
]);

oci_close($conn);
?>