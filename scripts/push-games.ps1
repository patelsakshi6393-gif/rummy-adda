# Script to push standalone games to GitHub repositories
param (
    [string]$GithubToken = ""
)

$ErrorActionPreference = "Stop"

# Helper to push a folder
function Push-GameRepo {
    param (
        [string]$FolderName,
        [string]$RepoUrl,
        [string]$GameName
    )

    Write-Host "`n>>> Processing $GameName ($FolderName) -> $RepoUrl..." -ForegroundColor Cyan
    $tempDir = Join-Path $env:TEMP "git-push-$FolderName"
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    Copy-Item -Path "$FolderName\*" -Destination $tempDir -Recurse
    
    Push-Location $tempDir
    try {
        git init -b main
        git config user.name "vermashreyansh580-jpg"
        git config user.email "vermashreyansh580@gmail.com"
        git add .
        git commit -m "feat: initial commit for $GameName standalone game"
        
        $targetUrl = $RepoUrl
        if ($GithubToken -ne "") {
            # Use PAT token in remote URL for authentication
            $targetUrl = $RepoUrl -replace "https://github.com/", "https://$($GithubToken)@github.com/"
        }
        
        git remote add origin $targetUrl
        $env:GIT_TERMINAL_PROMPT = "0"
        Write-Host "Pushing to $RepoUrl..." -ForegroundColor Yellow
        git push -u origin main --force
        Write-Host ">>> Successfully pushed $GameName!" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to push ${GameName} - $_"
    }
    finally {
        Pop-Location
        if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
    }
}

# 1. Push Rummy Ludo
Push-GameRepo -FolderName "rummyludo" -RepoUrl "https://github.com/vermashreyansh580-jpg/rummy-ludo.git" -GameName "Rummy Ludo"

# 2. Push Rummy Aviator
Push-GameRepo -FolderName "rummyaviator" -RepoUrl "https://github.com/vermashreyansh580-jpg/rummy-aviator.git" -GameName "Rummy Aviator"
