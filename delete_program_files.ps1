# Ki?m tra quy?n qu?n tr?
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "C?n ch?y v?i quy?n qu?n tr?."
    return
}

# Th� m?c c?n xo�
$folderPath = "C:\Program Files (x86)"

# X�c nh?n l?i r?ng ��y l� th� m?c ch�nh x�c v� kh�ng ph?i l� th� m?c g?c
if ($folderPath -eq "C:\Program Files (x86)") {
    Write-Warning "Kh�ng th? xo� th� m?c g?c."
    return
}

# Xo� th� m?c v� t?t c? c�c t?p tin trong �� m� kh�ng c?n x�c nh?n
Remove-Item -Path $folderPath\* -Recurse -Force