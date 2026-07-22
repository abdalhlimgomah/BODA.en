# -*- coding: utf-8 -*-
<#
.SYNOPSIS
    ينشئ مهمة مجدولة في Windows لتحديث توكن تاجر أتوماتيك كل يوم
.DESCRIPTION
    يشغل السكربت refresh-token.py كل يوم في الساعة 4 صباحًا
    المهمة بتشتغل فقط لما تكون مسجل دخول في Windows (Run only when user is logged on)
    عشان Chrome يقدر يستخدم Google session بتاعتك
#>

$scriptPath = "C:\Users\BODa\Documents\Date bsnas Home BODA\موقع الخاص بك\assets\js\taager_token_refresh.py"
$taskName = "TaagerTokenRefresh"
$pythonExe = (Get-Command python.exe).Source

# Create the scheduled task action
$action = New-ScheduledTaskAction -Execute $pythonExe -Argument "`"$scriptPath`""

# Run daily at 4:00 AM
$trigger = New-ScheduledTaskTrigger -Daily -At 4am

# Run with current user's privileges (only when logged on)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Register the task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "يجدد توكن Taager JWT كل يوم أتوماتيك" -Force

Write-Host "✅ تم إنشاء المهمة المجدولة '$taskName'"
Write-Host "   السكربت: $scriptPath"
Write-Host "   الموعد: كل يوم 4 صباحًا"
Write-Host "   البرنامج: $pythonExe"
Write-Host ""
Write-Host "ملاحظة: أول مرة هيفتح Chrome وتحتاج تسجل دخول يدويًا"
Write-Host "بعد كده هيتجدد أتوماتيك كل يوم وأنت نايم 😴"
Write-Host ""

# Show the task
Get-ScheduledTask -TaskName $taskName | Format-List TaskName, State, Description
