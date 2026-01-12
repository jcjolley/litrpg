$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine')
$newPath = ($currentPath -split ';' | Where-Object { $_ -notlike '*Podman*' }) -join ';'
[Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine')
Write-Host "Podman removed from Machine PATH"
