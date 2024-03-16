if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "C?n ch?y v?i quy?n qu?n tr?."
    return
}

$folderPath = "C:\Program Files (x86)"

Get-ChildItem -Path $folderPath -Filter "scoped_dir*" -Recurse | ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force
}
