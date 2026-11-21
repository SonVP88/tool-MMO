import sys
import os
import shutil
import subprocess
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = ROOT_DIR / "tool-MMO"

def find_7zip():
    candidates = [
        r"C:\Program Files\7-Zip\7z.exe",
        r"C:\Program Files (x86)\7-Zip\7z.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    # Try PATH
    z_path = shutil.which("7z")
    if z_path:
        return z_path
    return None

def clean_temp_files():
    print("[*] Đang dọn dẹp các file cache và file tạm...")
    temp_dir = PROJECT_DIR / "python-worker" / "temp"
    if temp_dir.exists():
        for item in temp_dir.iterdir():
            try:
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
            except Exception:
                pass
    
    # Remove pycache
    for p in PROJECT_DIR.rglob("__pycache__"):
        try:
            shutil.rmtree(p)
        except Exception:
            pass

def ensure_dist_build():
    dist_dir = PROJECT_DIR / "dist"
    if not (dist_dir / "index.html").exists():
        print("[*] Đang biên dịch giao diện Frontend sản phẩm (npm run build)...")
        subprocess.run(["npm", "run", "build"], cwd=str(PROJECT_DIR), shell=True)

def package_with_password(password, output_format="7z"):
    seven_zip = find_7zip()
    if not seven_zip:
        print("[!] Không tìm thấy phần mềm 7-Zip trên máy!")
        print("    Vui lòng cài đặt 7-Zip hoặc WinRAR để mã hóa đặt mật khẩu.")
        return False

    clean_temp_files()
    ensure_dist_build()

    date_str = datetime.now().strftime("%Y%m%d_%H%M")
    out_filename = f"AutomationStudio_MMO_Pro_{date_str}.{output_format}"
    out_path = ROOT_DIR / out_filename

    if out_path.exists():
        out_path.unlink()

    print(f"\n[*] Đang tiến hành nén và cài đặt mật khẩu mã hóa quân sự (AES-256)...")

    # Files and folders to include
    include_items = [
        "dist",
        "python-worker",
        "run_desktop_app.py",
        "CHAY_APP.bat",
        "Chay_App_Desktop.bat",
        "1_Cai_Dat_Moi_Truong.bat",
        "requirements.txt",
        "config",
    ]

    cmd = [
        seven_zip,
        "a",
        str(out_path),
        "-t" + ("7z" if output_format == "7z" else "zip"),
        f"-p{password}",
    ]

    # Encrypt headers if 7z (cannot see filenames without password)
    if output_format == "7z":
        cmd.append("-mhe=on")

    cmd.extend([
        "-xr!.git",
        "-xr!node_modules",
        "-xr!src-tauri/target",
        "-xr!__pycache__",
        "-xr!*.pyc",
        "-xr!temp/*",
    ])

    for item in include_items:
        full_item = PROJECT_DIR / item
        if full_item.exists():
            cmd.append(str(full_item))

    # Also include root README / Guide if exists
    guide_file = ROOT_DIR / "HUONG_DAN_SU_DUNG.txt"
    if not guide_file.exists():
        with open(guide_file, "w", encoding="utf-8") as f:
            f.write(
                "===========================================================\n"
                "  HUONG DAN SU DUNG AUTOMATION STUDIO MMO PRO\n"
                "===========================================================\n\n"
                "1. Cai dat lan dau:\n"
                "   - Chay file '1_Cai_Dat_Moi_Truong.bat' de cai dat thu vien Python.\n\n"
                "2. Khoi dong ung dung:\n"
                "   - Nhap dup chuot vao file 'Chay_App_Desktop.bat'.\n"
                "   - Cua so phan mem Desktop se tu dong xuat hien.\n\n"
                "3. Yeu cau he thong:\n"
                "   - Windows 10 hoac Windows 11 (64-bit).\n"
                "   - Da cai san Python 3.10+ (tich chon 'Add Python to PATH' khi cai).\n"
                "===========================================================\n"
            )
    cmd.append(str(guide_file))

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if res.returncode == 0 and out_path.exists():
        size_mb = round(out_path.stat().st_size / (1024 * 1024), 2)
        print("\n===========================================================")
        print(" [OK] DONG GOI VA DAT MAT KHAU THANH CONG!")
        print(f" - File da tao: {out_path.name}")
        print(f" - Dung luong:  {size_mb} MB")
        print(f" - Duong dan:   {out_path}")
        print(f" - Mat khau mo: {password}")
        print("===========================================================")
        print("\n* Luu y: Chi nhung nguoi co dung mat khau nay moi co the mo va giai nen file.")
        return True
    else:
        print("[!] Co loi xay ra khi nen file:")
        print(res.stderr or res.stdout)
        return False

if __name__ == "__main__":
    print("===========================================================")
    print("  CONG CU DONG GOI VA DAT MAT KHAU CHO PHAN MEM MMO")
    print("===========================================================")
    
    if len(sys.argv) > 1:
        pwd = sys.argv[1].strip()
    else:
        pwd = input("\nNhap mat khau ban muon dat cho file nen (Vi du: 123456): ").strip()

    if not pwd:
        print("[!] Mat khau khong duoc de trong!")
        sys.exit(1)

    fmt = "7z"
    if len(sys.argv) > 2:
        fmt = sys.argv[2].strip()

    package_with_password(pwd, fmt)

