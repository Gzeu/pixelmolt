# Draw Moltbook Crab Logo on PixelMolt
# Multiple agents collaborate to draw the crab

$API = "http://localhost:3100/api/pixel"
$CANVAS_ID = "default"

# Agent names for collaboration
$Agents = @(
    "CrabMaster", "ClawPainter", "ShellArtist", "MoltDrawer",
    "PinchBot", "RedClaw", "OceanArtist", "PixelCrab",
    "ShellMaker", "CrustaceanAI", "LobsterPaint", "CoralBot"
)

# Crab colors
$RED = "#FF4444"
$DARK_RED = "#CC2222"
$ORANGE = "#FF8844"
$BLACK = "#111111"
$WHITE = "#FFFFFF"

# Starting position (center-ish of visible area)
$StartX = 100
$StartY = 100

# Crab pixel art pattern (simplified 32x24 crab)
# Each row is: x-offset, y-offset, color
$CrabPixels = @(
    # Left claw
    @(0, 8, $RED), @(1, 7, $RED), @(1, 8, $RED), @(1, 9, $RED),
    @(2, 6, $RED), @(2, 7, $DARK_RED), @(2, 8, $DARK_RED), @(2, 9, $RED), @(2, 10, $RED),
    @(3, 5, $RED), @(3, 6, $DARK_RED), @(3, 7, $RED), @(3, 9, $RED), @(3, 10, $RED),
    @(4, 5, $RED), @(4, 6, $RED), @(4, 10, $RED),
    @(5, 6, $RED), @(5, 7, $RED), @(5, 8, $RED), @(5, 9, $RED),
    
    # Right claw (mirrored)
    @(26, 8, $RED), @(25, 7, $RED), @(25, 8, $RED), @(25, 9, $RED),
    @(24, 6, $RED), @(24, 7, $DARK_RED), @(24, 8, $DARK_RED), @(24, 9, $RED), @(24, 10, $RED),
    @(23, 5, $RED), @(23, 6, $DARK_RED), @(23, 7, $RED), @(23, 9, $RED), @(23, 10, $RED),
    @(22, 5, $RED), @(22, 6, $RED), @(22, 10, $RED),
    @(21, 6, $RED), @(21, 7, $RED), @(21, 8, $RED), @(21, 9, $RED),
    
    # Body (shell) - center oval
    @(8, 8, $RED), @(9, 7, $RED), @(10, 6, $RED), @(11, 6, $RED), @(12, 6, $RED),
    @(13, 6, $RED), @(14, 6, $RED), @(15, 6, $RED), @(16, 6, $RED), @(17, 7, $RED), @(18, 8, $RED),
    
    @(7, 9, $RED), @(8, 9, $ORANGE), @(9, 8, $ORANGE), @(10, 7, $ORANGE), @(11, 7, $RED),
    @(12, 7, $RED), @(13, 7, $RED), @(14, 7, $RED), @(15, 7, $ORANGE), @(16, 7, $ORANGE),
    @(17, 8, $ORANGE), @(18, 9, $ORANGE), @(19, 9, $RED),
    
    @(7, 10, $RED), @(8, 10, $ORANGE), @(9, 9, $ORANGE), @(10, 8, $ORANGE), @(11, 8, $ORANGE),
    @(12, 8, $ORANGE), @(13, 8, $ORANGE), @(14, 8, $ORANGE), @(15, 8, $ORANGE), @(16, 8, $ORANGE),
    @(17, 9, $ORANGE), @(18, 10, $ORANGE), @(19, 10, $RED),
    
    @(7, 11, $RED), @(8, 11, $ORANGE), @(9, 10, $ORANGE), @(10, 9, $ORANGE), @(11, 9, $RED),
    @(12, 9, $RED), @(13, 9, $RED), @(14, 9, $RED), @(15, 9, $ORANGE), @(16, 9, $ORANGE),
    @(17, 10, $ORANGE), @(18, 11, $ORANGE), @(19, 11, $RED),
    
    @(8, 12, $RED), @(9, 11, $RED), @(10, 10, $RED), @(11, 10, $RED), @(12, 10, $RED),
    @(13, 10, $RED), @(14, 10, $RED), @(15, 10, $RED), @(16, 10, $RED), @(17, 11, $RED), @(18, 12, $RED),
    
    @(9, 12, $RED), @(10, 11, $RED), @(11, 11, $RED), @(12, 11, $RED),
    @(13, 11, $RED), @(14, 11, $RED), @(15, 11, $RED), @(16, 11, $RED), @(17, 12, $RED),
    
    # Eyes
    @(11, 5, $BLACK), @(12, 4, $BLACK), @(12, 5, $WHITE),
    @(15, 5, $BLACK), @(14, 4, $BLACK), @(14, 5, $WHITE),
    
    # Legs (left side)
    @(6, 10, $DARK_RED), @(5, 11, $DARK_RED), @(4, 12, $DARK_RED),
    @(6, 11, $DARK_RED), @(5, 12, $DARK_RED), @(4, 13, $DARK_RED),
    @(7, 12, $DARK_RED), @(6, 13, $DARK_RED), @(5, 14, $DARK_RED),
    
    # Legs (right side)
    @(20, 10, $DARK_RED), @(21, 11, $DARK_RED), @(22, 12, $DARK_RED),
    @(20, 11, $DARK_RED), @(21, 12, $DARK_RED), @(22, 13, $DARK_RED),
    @(19, 12, $DARK_RED), @(20, 13, $DARK_RED), @(21, 14, $DARK_RED)
)

Write-Host "🦀 Drawing Moltbook Crab with $($Agents.Count) agents..." -ForegroundColor Cyan
Write-Host "   Starting at ($StartX, $StartY)" -ForegroundColor Gray
Write-Host ""

$placed = 0
$errors = 0

foreach ($pixel in $CrabPixels) {
    $x = $StartX + $pixel[0]
    $y = $StartY + $pixel[1]
    $color = $pixel[2]
    
    # Pick random agent
    $agent = $Agents | Get-Random
    
    $body = @{
        canvasId = $CANVAS_ID
        x = $x
        y = $y
        color = $color
        agentId = $agent
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $API -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        if ($response.success) {
            $placed++
            Write-Host "[$agent] placed $color at ($x, $y)" -ForegroundColor Green
        } else {
            $errors++
            Write-Host "[$agent] failed: $($response.error)" -ForegroundColor Yellow
        }
    } catch {
        $errors++
        Write-Host "[$agent] error: $_" -ForegroundColor Red
    }
    
    # Small delay to spread out (rate limit is 1/sec per agent, but different agents)
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "🦀 Crab complete!" -ForegroundColor Cyan
Write-Host "   Pixels placed: $placed" -ForegroundColor Green
Write-Host "   Errors: $errors" -ForegroundColor $(if ($errors -gt 0) { "Yellow" } else { "Gray" })
