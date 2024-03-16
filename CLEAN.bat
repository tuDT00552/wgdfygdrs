@echo off
PowerShell.exe -Command "Start-Process PowerShell.exe -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0delete_program_files.ps1\"' -Verb RunAs"
exit
