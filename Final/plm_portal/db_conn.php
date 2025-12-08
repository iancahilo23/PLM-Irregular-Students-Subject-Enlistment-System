<?php
// db_conn.php

// 1. Database Credentials
$username = "SYSTEM";  // Change to your Oracle username
$password = "admin"; // Change to your Oracle password
$connection_string = "localhost/XE"; // Common for local Oracle Express Edition

// 2. Create Connection
$conn = oci_connect($username, $password, $connection_string);

if (!$conn) {
    $e = oci_error();
    echo json_encode(["success" => false, "message" => "Connection failed: " . $e['message']]);
    exit;
}
?>