import os
import shutil
import zipfile

zip_targets = [
    r"d:\aipdfgenrater\aipdfgenrater_latest.zip",
    r"d:\aipdfgenrater\aipdfgenrater_cpanel_TODAY.zip",
    r"d:\aipdfgenrater\aipdfgenrater_cpanel_FINAL.zip"
]
base_dir = r"d:\aipdfgenrater"

included_dirs = ['admin', 'api', 'css', 'data', 'images', 'inquiry-admin', 'js', 'sql', 'uploads', 'website']
included_files = ['index.html', 'index.php', 'studio.html', 'view.html', 'dashboard.html', 'staff.html', '.htaccess', '.user.ini', 'php.ini', 'database.sql']

print(f"Building deployment ZIP archives...")

primary_zip = zip_targets[0]
file_count = 0
total_uncompressed_bytes = 0

with zipfile.ZipFile(primary_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    # Add files
    for f in included_files:
        fp = os.path.join(base_dir, f)
        if os.path.exists(fp):
            zf.write(fp, f)
            file_count += 1
            total_uncompressed_bytes += os.path.getsize(fp)
            print(f"  + Added file: {f}")

    # Add directories
    for d in included_dirs:
        dp = os.path.join(base_dir, d)
        if os.path.exists(dp):
            for root, dirs, files in os.walk(dp):
                for file in files:
                    if file.endswith(('.py', '.pyc', '.log', '.tmp')):
                        continue
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, base_dir)
                    zf.write(full_p, rel_p)
                    file_count += 1
                    total_uncompressed_bytes += os.path.getsize(full_p)

# Copy to other targets
for zt in zip_targets[1:]:
    shutil.copyfile(primary_zip, zt)
    print(f"  -> Synced to: {zt}")

# Copy to artifacts directory
artifact_dir = r"C:\Users\hp\.gemini\antigravity\brain\363feb0f-73d7-418e-9aa7-a0c01affbb29"
if os.path.exists(artifact_dir):
    shutil.copyfile(primary_zip, os.path.join(artifact_dir, "aipdfgenrater_latest.zip"))
    print(f"  -> Synced to Artifact Directory: {os.path.join(artifact_dir, 'aipdfgenrater_latest.zip')}")

final_size = os.path.getsize(primary_zip)
print(f"\n[DONE] Successfully created deployment archives.")
print(f"Total files: {file_count}")
print(f"Uncompressed size: {round(total_uncompressed_bytes / (1024*1024), 2)} MB")
print(f"Compressed ZIP size: {round(final_size / (1024*1024), 2)} MB ({final_size} bytes)")

