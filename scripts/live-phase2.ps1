$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api/v1'
$repoRoot = Split-Path -Parent $PSScriptRoot
$envLines = Get-Content (Join-Path $repoRoot '.env')
function EnvValue($name) { ($envLines | Where-Object { $_ -match "^$name=(.*)$" } | Select-Object -First 1) -replace "^$name=", '' }
$health = $null
try { $health = Invoke-WebRequest "$base/health" -UseBasicParsing -TimeoutSec 10 } catch { }
if (!$health -or $health.StatusCode -ne 200) { throw "API is not running at $base. Start npm run dev --workspace=@cloud-saas/api before running this script." }

$mailtrapToken = EnvValue 'MAILTRAP_API_TOKEN'
$mailtrapAccount = EnvValue 'MAILTRAP_ACCOUNT_ID'
$mailtrapInbox = EnvValue 'MAILTRAP_INBOX_ID'
if (!$mailtrapToken -or !$mailtrapAccount -or !$mailtrapInbox) { throw 'Mailtrap API variables are required' }
$headers = @{ Authorization = "Bearer $mailtrapToken" }
function Api($label, $method, $path, $body, $jar) {
  $params = @{ Uri = "$base$path"; Method = $method; WebSession = $jar; UseBasicParsing = $true }
  if ($null -ne $body) { $params.ContentType = 'application/json'; $params.Body = ($body | ConvertTo-Json -Compress) }
  try {
    $r = Invoke-WebRequest @params
    $json = if ($r.Content) { try { $r.Content | ConvertFrom-Json } catch { $r.Content } } else { $null }
    $cookieNames = @($r.Headers['Set-Cookie'] | ForEach-Object { if ($_ -match '^(access_token|refresh_token)=') { $Matches[1] } })
    [pscustomobject]@{ label=$label; status=[int]$r.StatusCode; body=$json; cookies=$cookieNames }
  } catch {
    $resp = $_.Exception.Response
    $content = if ($resp) { [IO.StreamReader]::new($resp.GetResponseStream()).ReadToEnd() } else { $_.Exception.Message }
    $json = try { $content | ConvertFrom-Json } catch { $content }
    [pscustomobject]@{ label=$label; status=if($resp){[int]$resp.StatusCode}else{0}; body=$json; cookies=@() }
  }
}
function Show($result) {
  $body = if ($result.body -is [string]) { $result.body } else { $result.body | ConvertTo-Json -Compress -Depth 8 }
  Write-Output ("[{0}] HTTP {1} {2}" -f $result.label, $result.status, $body)
  if ($result.cookies.Count) { Write-Output ("[{0}] cookies: {1}" -f $result.label, ($result.cookies -join ', ')) }
}
function WaitEmailCooldown {
  Write-Output "[mailtrap] waiting 15 seconds before sending another email"
  Start-Sleep -Seconds 15
}
function WaitMail($recipient, $subjectPart, $since) {
  $url = "https://mailtrap.io/api/accounts/$mailtrapAccount/inboxes/$mailtrapInbox/messages"
  for ($i=0; $i -lt 30; $i++) {
    $messages = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    foreach ($m in @($messages)) {
      $to = (($m.to_email, $m.to) -join ' ')
      $subject = [string]($m.subject)
      $created = try { ([datetime]$m.created_at).ToUniversalTime() } catch { [datetime]::MinValue }
      if ($to -like "*$recipient*" -and $subject -like "*$subjectPart*" -and $created -ge $since) {
        $id = $m.id
        $detail = Invoke-RestMethod -Uri "$url/$id" -Headers $headers -Method Get
        $text = Invoke-RestMethod -Uri ("https://mailtrap.io" + $detail.txt_path) -Headers $headers -Method Get
        $match = [regex]::Match([string]$text, 'https?://[^\s"<>]+')
        if ($match.Success) { return $match.Value.TrimEnd('.', ',', ')') }
      }
    }
    Start-Sleep -Seconds 5
  }
  throw "Timed out waiting for Mailtrap message '$subjectPart' to $recipient"
}
function TokenFromUrl($url) {
  $uri = [Uri]$url
  $query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
  $token = $query.Get('token')
  if (!$token) { throw "Mailtrap link did not contain a token" }
  return $token
}
function CookieValue($jar, $name) {
  $cookie = $jar.Cookies.GetCookies('http://localhost:3000') | Where-Object Name -eq $name | Select-Object -First 1
  if ($cookie) { return $cookie.Value }
  return $null
}
$stamp = Get-Date -Format yyyyMMddHHmmss
$userA = "phase2a-$stamp@example.com"; $userB = "phase2b-$stamp@example.com"
$pass = 'Phase2Pass!123'; $jarA = [Microsoft.PowerShell.Commands.WebRequestSession]::new(); $jarB = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$since = (Get-Date).ToUniversalTime()
WaitEmailCooldown
$r = Api 'register-A' POST '/auth/register' @{email=$userA;password=$pass} $jarA; Show $r
$verificationUrl = WaitMail $userA 'Verify your Cloud SaaS email' $since; Write-Output "[mailtrap] verification link received for A"
$verificationToken = TokenFromUrl $verificationUrl; $r = Api 'verify-A' GET ("/auth/verify-email?token=" + [Uri]::EscapeDataString($verificationToken)) $null $jarA; Show $r
$r = Api 'login-A' POST '/auth/login' @{email=$userA;password=$pass} $jarA; Show $r
$oldRefresh = CookieValue $jarA 'refresh_token'; $r = Api 'refresh-A' POST '/auth/refresh' $null $jarA; Show $r
$newRefresh = CookieValue $jarA 'refresh_token'; Write-Output "[refresh-A] rotated=$([bool]($oldRefresh -and $newRefresh -and $oldRefresh -ne $newRefresh))"
$oldJar = [Microsoft.PowerShell.Commands.WebRequestSession]::new(); $oldJar.Cookies.Add((New-Object System.Net.Cookie('refresh_token',$oldRefresh,'/','localhost'))); $r = Api 'old-refresh-rejected' POST '/auth/refresh' $null $oldJar; Show $r
$resetSince = (Get-Date).ToUniversalTime()
WaitEmailCooldown
$r = Api 'reset-request-A' POST '/auth/password-reset/request' @{email=$userA} $jarA; Show $r
$resetUrl = WaitMail $userA 'Reset your Cloud SaaS password' $resetSince; Write-Output "[mailtrap] password-reset link received for A"
$resetToken = TokenFromUrl $resetUrl; $r = Api 'reset-confirm-A' POST ("/auth/password-reset/confirm?token=" + [Uri]::EscapeDataString($resetToken)) @{password='Phase2Pass!456'} $null; Show $r
$r = Api 'old-access-after-reset' GET '/auth/me' $null $jarA; Show $r
$r = Api 'login-A-after-reset' POST '/auth/login' @{email=$userA;password='Phase2Pass!456'} $jarA; Show $r
$r = Api 'create-workspace-A' POST '/workspaces' @{name="Workspace A $stamp"} $jarA; Show $r; $workspaceA = $r.body.id
WaitEmailCooldown
$sinceB = (Get-Date).ToUniversalTime()
$r = Api 'register-B' POST '/auth/register' @{email=$userB;password=$pass} $jarB; Show $r
$verificationUrlB = WaitMail $userB 'Verify your Cloud SaaS email' $sinceB
$verificationTokenB = TokenFromUrl $verificationUrlB; $r=Api 'verify-B' GET ("/auth/verify-email?token=" + [Uri]::EscapeDataString($verificationTokenB)) $null $jarB; Show $r
$r = Api 'login-B' POST '/auth/login' @{email=$userB;password=$pass} $jarB; Show $r
$inviteSince = (Get-Date).ToUniversalTime()
WaitEmailCooldown
$r = Api 'invite-B-from-A' POST "/workspaces/$workspaceA/invitations" @{email=$userB;role='member'} $jarA; Show $r
$inviteUrl = WaitMail $userB 'You have been invited to Cloud SaaS' $inviteSince; Write-Output "[mailtrap] invitation link received for B"
$inviteToken = TokenFromUrl $inviteUrl; $r=Api 'accept-invite-B' POST '/workspaces/invitations/accept' @{token=$inviteToken} $jarB; Show $r
$r = Api 'cross-workspace-invite-with-B' POST "/workspaces/$workspaceA/invitations" @{email='nobody@example.com';role='member'} $jarB; Show $r
Write-Output "USER_A=$userA`nUSER_B=$userB`nWORKSPACE_A=$workspaceA"
