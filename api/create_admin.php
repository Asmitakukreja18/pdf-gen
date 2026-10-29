<?php
/**
 * api/create_admin.php — First-Time Admin Account Creation Helper
 * 
 * Use this page once to initialize your first secure admin account with native bcrypt hashing.
 * Once an admin account exists, this script automatically locks itself for security.
 */

require_once __DIR__ . '/db.php';

$pdo = getDb();
$error = '';
$success = '';

if (!$pdo) {
    die("Database connection failed. Please check your DB credentials in api/config.php first.");
}

// Check if an admin already exists
$checkStmt = $pdo->query("SELECT COUNT(*) AS total FROM users");
$row = $checkStmt->fetch();
$hasAdmin = ($row && (int)$row['total'] > 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($hasAdmin) {
        $error = "An administrator account already exists. For security, creation of additional accounts is locked here.";
    } else {
        $username = trim($_POST['username'] ?? '');
        $email    = trim($_POST['email'] ?? '');
        $password = trim($_POST['password'] ?? '');
        $confirm  = trim($_POST['confirm_password'] ?? '');

        if (empty($username) || empty($email) || empty($password)) {
            $error = "All fields are required.";
        } elseif ($password !== $confirm) {
            $error = "Passwords do not match.";
        } elseif (strlen($password) < 8) {
            $error = "Password must be at least 8 characters long.";
        } else {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            try {
                $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')");
                $stmt->execute([$username, $email, $hash]);
                $success = "Admin account '$username' created successfully! You can now log into your Admin Portal.";
                $hasAdmin = true;
            } catch (\PDOException $e) {
                $error = "Error creating account: " . $e->getMessage();
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Admin Account — Let's Explore DMC</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: #F4F7FB;
            color: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
        }
        .card {
            background: #FFFFFF;
            border: 1px solid #DCE4EF;
            border-radius: 20px;
            padding: 36px;
            max-width: 440px;
            width: 100%;
            box-shadow: 0 10px 30px rgba(23, 54, 93, 0.08);
        }
        h2 { margin-top: 0; color: #17365D; font-size: 22px; font-weight: 800; }
        p { font-size: 13.5px; color: #64748B; line-height: 1.5; }
        .alert { padding: 12px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
        .alert.error { background: #FEE2E2; border: 1px solid #FECACA; color: #DC2626; }
        .alert.success { background: #E6F8F0; border: 1px solid #A7F3D0; color: #059669; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 12.5px; font-weight: 700; color: #17365D; margin-bottom: 6px; }
        input {
            width: 100%; height: 44px; padding: 0 14px;
            background: #F8FAFC;
            border: 1px solid #DCE4EF;
            border-radius: 10px; color: #334155; font-size: 14px; box-sizing: border-box;
        }
        input:focus { outline: none; border-color: #3977B8; background: #FFFFFF; box-shadow: 0 0 0 3px rgba(57, 119, 184, 0.12); }
        button {
            width: 100%; height: 46px; background: linear-gradient(135deg, #3977B8, #2D6298);
            border: none; border-radius: 10px; color: #FFFFFF; font-weight: 700; font-size: 14px;
            cursor: pointer; margin-top: 10px; box-shadow: 0 4px 15px rgba(57, 119, 184, 0.25);
        }
        button:hover { background: linear-gradient(135deg, #4383c7, #346ea8); }
        .btn-portal {
            display: block; text-align: center; text-decoration: none; padding: 12px;
            background: #DCEBFA; border: 1px solid rgba(57, 119, 184, 0.3); border-radius: 10px;
            color: #3977B8; font-weight: 700; font-size: 14px; margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>🔐 Initial Admin Setup</h2>
        <p>Use this tool once to create your primary administrator account. The password will be hashed using secure BCrypt.</p>

        <?php if ($error): ?>
            <div class="alert error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <?php if ($success): ?>
            <div class="alert success"><?php echo htmlspecialchars($success); ?></div>
            <a href="../admin/login.html" class="btn-portal">Go to Admin Login &rarr;</a>
        <?php elseif ($hasAdmin): ?>
            <div class="alert success">An administrator account is already set up and active.</div>
            <a href="../admin/login.html" class="btn-portal">Go to Admin Login &rarr;</a>
        <?php else: ?>
            <form method="POST">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" placeholder="e.g. admin" required autofocus>
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" name="email" placeholder="e.g. admin@letsexploredmc.com" required>
                </div>
                <div class="form-group">
                    <label>Password (Minimum 8 characters)</label>
                    <input type="password" name="password" placeholder="••••••••••••" required>
                </div>
                <div class="form-group">
                    <label>Confirm Password</label>
                    <input type="password" name="confirm_password" placeholder="••••••••••••" required>
                </div>
                <button type="submit">Create Secure Admin Account</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>
