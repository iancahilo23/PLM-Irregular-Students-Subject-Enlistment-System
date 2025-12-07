<?php
// login.php
header('Content-Type: application/json');
require 'db_conn.php'; // Include connection file


$input = json_decode(file_get_contents('php://input'), true);
$student_id = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($student_id) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Missing credentials"]);
    exit;
}


$sql = "SELECT student_id FROM login WHERE student_id = :id AND password = :pass";
$stid = oci_parse($conn, $sql);


oci_bind_by_name($stid, ":id", $student_id);
oci_bind_by_name($stid, ":pass", $password);


oci_execute($stid);

if ($row = oci_fetch_assoc($stid)) {

    echo json_encode([
        "success" => true, 
        "studentId" => $row['STUDENT_ID'],
        "message" => "Login successful"
    ]);
} else {

    echo json_encode([
        "success" => false, 
        "message" => "Invalid Student ID or Password"
    ]);
}

oci_free_statement($stid);
oci_close($conn);
?>