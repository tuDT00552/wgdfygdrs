# Ki?m tra quy?n qu?n tr?
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "C?n ch?y v?i quy?n qu?n tr?."
    return
}

# Thý m?c c?n xoá
$folderPath = "C:\Program Files (x86)"

# Xác nh?n l?i r?ng ðây là thý m?c chính xác và không ph?i là thý m?c g?c
if ($folderPath -eq "C:\Program Files (x86)") {
    Write-Warning "Không th? xoá thý m?c g?c."
    return
}

# Xoá thý m?c và t?t c? các t?p tin trong ðó mà không c?n xác nh?n
Remove-Item -Path $folderPath\* -Recurse -Force