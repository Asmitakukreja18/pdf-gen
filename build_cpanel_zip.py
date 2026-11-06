import os
import zipfile

zip_path = r"d:\aipdfgenrater\aipdfgenrater_cpanel_FINAL.zip"
base_dir = r"d:\aipdfgenrater"

included_dirs = ['api', 'css', 'images', 'inquiry-admin', 'js', 'uploads', 'data']
included_files = ['index.html', 'index.php', 'studio.html', 'view.html', 'dashboard.html', 'staff.html', '.htaccess', '.user.ini', 'php.ini', 'database.sql']

print(f"Building deployment ZIP: {zip_path}")

file_count = 0
total_uncompressed_bytes = 0

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
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
                    # Skip python scripts or temp logs
                    if file.endswith(('.py', '.pyc', '.log', '.tmp')):
                        continue
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, base_dir)
                    zf.write(full_p, rel_p)
                    file_count += 1
                    total_uncompressed_bytes += os.path.getsize(full_p)

final_size = os.path.getsize(zip_path)
print(f"\n[DONE] Successfully created {zip_path}")
print(f"Total files: {file_count}")
print(f"Uncompressed size: {round(total_uncompressed_bytes / (1024*1024), 2)} MB")
print(f"Compressed ZIP size: {round(final_size / (1024*1024), 2)} MB ({final_size} bytes)")

