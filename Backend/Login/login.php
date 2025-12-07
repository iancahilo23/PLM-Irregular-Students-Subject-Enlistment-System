<?php
// login.php

// 1. START SESSION (Crucial! This allows the server to "remember" the user)
session_start();

header('Content-Type: application/json');
require 'db_conn.php'; 

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);
$student_id = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($student_id) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Missing credentials"]);
    exit;
}

// Check credentials
// Note: We select STUDENT_ID to ensure we have the correct column for the session
$sql = "SELECT STUDENT_ID FROM login WHERE STUDENT_ID = :id AND PASSWORD = :pass";
$stid = oci_parse($conn, $sql);

oci_bind_by_name($stid, ":id", $student_id);
oci_bind_by_name($stid, ":pass", $password);

oci_execute($stid);

if ($row = oci_fetch_assoc($stid)) {

    // 2. SAVE ID TO SESSION (Crucial! The dashboard looks for this specific variable)
    // Oracle returns keys in UPPERCASE, so we use ['STUDENT_ID']
    $_SESSION['student_id'] = $row['STUDENT_ID'];

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