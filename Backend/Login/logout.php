<?php
// c:/xampp/htdocs/plm_portal/logout.php

session_start(); // Resume the session

session_unset(); // Unset all session variables

session_destroy(); // Destroy the session data on the server

// Redirect the user to the login page
header("Location: LoginPage.html");
exit; // Ensure no further code is executed
?>