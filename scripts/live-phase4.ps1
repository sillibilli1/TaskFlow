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
try {
  Invoke-RestMethod -Uri "https://mailtrap.io/api/accounts/$mailtrapAccount/inboxes/$mailtrapInbox/clean" -Headers $headers -Method Patch | Out-Null
  Write-Output "[mailtrap] cleaned inbox before starting test"
} catch { }
function Api($label, $method, $path, $body, $jar, $idempotencyKey) {
  $params = @{ Uri = "$base$path"; Method = $method; WebSession = $jar; UseBasicParsing = $true }
  $reqHeaders = @{}
  if ($idempotencyKey) { $reqHeaders['Idempotency-Key'] = $idempotencyKey }
  if ($reqHeaders.Count) { $params.Headers = $reqHeaders }
  if ($null -ne $body) { $params.ContentType = 'application/json'; $params.Body = ($body | ConvertTo-Json -Compress -Depth 8) }
  try {
    $r = Invoke-WebRequest @params
    $json = if ($r.Content) { try { $r.Content | ConvertFrom-Json } catch { $r.Content } } else { $null }
    [pscustomobject]@{ label=$label; status=[int]$r.StatusCode; body=$json }
  } catch {
    $resp = $_.Exception.Response
    $content = if ($resp) { [IO.StreamReader]::new($resp.GetResponseStream()).ReadToEnd() } else { $_.Exception.Message }
    $json = try { $content | ConvertFrom-Json } catch { $content }
    [pscustomobject]@{ label=$label; status=if($resp){[int]$resp.StatusCode}else{0}; body=$json }
  }
}
function Show($result) {
  $body = if ($result.body -is [string]) { $result.body } else { $result.body | ConvertTo-Json -Compress -Depth 8 }
  Write-Output ("[{0}] HTTP {1} {2}" -f $result.label, $result.status, $body)
}
function AssertStatus($result, $expected) {
  if ($result.status -ne $expected) { Show $result; throw "[$($result.label)] expected HTTP $expected, got $($result.status)" }
  Write-Output "[assert] $($result.label) returned HTTP $expected"
}
function AssertTrue($condition, $message) {
  if (!$condition) { throw "Assertion failed: $message" }
  Write-Output "[assert] $message"
}
function WaitEmailCooldown {
  Write-Output "[mailtrap] waiting 15 seconds before sending another email"
  Start-Sleep -Seconds 15
}
function WaitMail($recipient, $subjectPart, $since) {
  $url = "https://mailtrap.io/api/accounts/$mailtrapAccount/inboxes/$mailtrapInbox/messages"
  for ($i=0; $i -lt 30; $i++) {
    try {
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
          return [string]$text
        }
      }
    } catch { }

    try {
      $redisOutput = node -e "
        const fs = require('fs');
        const path = require('path');
        const Redis = require('ioredis');
        const envText = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
        const env = {};
        for (const line of envText.split('\n')) {
          const t = line.trim();
          if (!t || t.startsWith('#')) continue;
          const idx = t.indexOf('=');
          if (idx > 0) env[t.slice(0, idx)] = t.slice(idx + 1);
        }
        const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
        redis.lrange('taskflow:sent_emails', 0, 30).then(items => {
          console.log(JSON.stringify(items.map(i => JSON.parse(i))));
          redis.quit();
        }).catch(() => { console.log('[]'); redis.quit(); });
      "
      if ($redisOutput) {
        $redisMsgs = try { $redisOutput | ConvertFrom-Json } catch { @() }
        foreach ($rm in @($redisMsgs)) {
          $to = [string]$rm.to_email
          $subject = [string]$rm.subject
          $created = try { ([datetime]$rm.created_at).ToUniversalTime() } catch { [datetime]::MinValue }
          if ($to -like "*$recipient*" -and $subject -like "*$subjectPart*" -and $created -ge $since) {
            $text = [string]$rm.text
            $match = [regex]::Match($text, 'https?://[^\s"<>]+')
            if ($match.Success) { return $match.Value.TrimEnd('.', ',', ')') }
            return $text
          }
        }
      }
    } catch { }

    Start-Sleep -Seconds 3
  }
  throw "Timed out waiting for message '$subjectPart' to $recipient"
}
function TokenFromUrl($url) {
  $uri = [Uri]$url
  $query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
  $token = $query.Get('token')
  if (!$token) { throw "Mailtrap link did not contain a token" }
  return $token
}

$stamp = Get-Date -Format yyyyMMddHHmmss
$userA = "phase4a-$stamp@example.com"
$userB = "phase4b-$stamp@example.com"
$pass = 'Phase4Pass!123'
$jarA = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$jarB = [Microsoft.PowerShell.Commands.WebRequestSession]::new()

WaitEmailCooldown
$sinceA = (Get-Date).ToUniversalTime()
$r = Api 'register-A' POST '/auth/register' @{email=$userA;password=$pass} $jarA $null; Show $r; AssertStatus $r 201
$verificationUrl = WaitMail $userA 'Verify your Cloud SaaS email' $sinceA
$r = Api 'verify-A' GET ("/auth/verify-email?token=" + [Uri]::EscapeDataString((TokenFromUrl $verificationUrl))) $null $jarA $null; Show $r; AssertStatus $r 200
$r = Api 'login-A' POST '/auth/login' @{email=$userA;password=$pass} $jarA $null; Show $r; AssertStatus $r 200
$r = Api 'workspace-A' POST '/workspaces' @{name="Phase 4 $stamp"} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 201
$workspaceA = $r.body.id
$r = Api 'project-A' POST "/workspaces/$workspaceA/projects" @{name="Phase 4 Project"} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 201
$projectA = $r.body.id
$r = Api 'label-A' POST "/workspaces/$workspaceA/labels" @{name="release"} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 201
$labelA = $r.body.id
$r = Api 'task-A' POST "/workspaces/$workspaceA/projects/$projectA/tasks" @{title='Attach a file';status='todo';priority='high';labelIds=@($labelA)} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 201
$taskA = $r.body.id
AssertTrue ($r.body.labels.Count -ge 1) 'created task includes labels'

$idem = [guid]::NewGuid().ToString()
$r = Api 'idempotent-create' POST "/workspaces/$workspaceA/projects/$projectA/tasks" @{title='Idempotent task'} $jarA $idem; Show $r; AssertStatus $r 201
$firstId = $r.body.id
$r = Api 'idempotent-replay' POST "/workspaces/$workspaceA/projects/$projectA/tasks" @{title='Idempotent task'} $jarA $idem; Show $r; AssertStatus $r 201
AssertTrue ($r.body.id -eq $firstId) 'idempotent replay returns the original task'
$r = Api 'idempotent-conflict' POST "/workspaces/$workspaceA/projects/$projectA/tasks" @{title='Different payload'} $jarA $idem; Show $r; AssertStatus $r 409

$filePath = Join-Path $env:TEMP "taskflow-phase4-$stamp.txt"
Set-Content -Path $filePath -Value "phase 4 live attachment $stamp" -Encoding utf8
$fileBytes = [IO.File]::ReadAllBytes($filePath)
$r = Api 'presign' POST "/workspaces/$workspaceA/tasks/$taskA/attachments/presign" @{filename="notes.txt";mimeType='text/plain';size=$fileBytes.Length} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 201
$uploadHeaders = @{ Authorization = "Bearer $($r.body.token)"; 'Content-Type' = 'text/plain'; 'x-upsert' = 'false' }
$upload = Invoke-WebRequest -Uri $r.body.signedUrl -Method PUT -Headers $uploadHeaders -Body $fileBytes -UseBasicParsing
AssertTrue ($upload.StatusCode -ge 200 -and $upload.StatusCode -lt 300) 'signed upload succeeded'
$attachmentId = $r.body.attachmentId
$r = Api 'complete-upload' POST "/workspaces/$workspaceA/tasks/$taskA/attachments/complete" @{attachmentId=$attachmentId} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 201
$r = Api 'list-attachments' GET "/workspaces/$workspaceA/tasks/$taskA/attachments" $null $jarA $null; Show $r; AssertStatus $r 200
AssertTrue (@($r.body.items).Count -ge 1) 'attachment metadata is listed'
$r = Api 'download' GET "/workspaces/$workspaceA/tasks/$taskA/attachments/$attachmentId/download" $null $jarA $null; Show $r; AssertStatus $r 200
$downloaded = Invoke-WebRequest -Uri $r.body.signedUrl -UseBasicParsing
AssertTrue ($downloaded.Content.ToString().Contains("phase 4 live attachment")) 'downloaded file content matches the uploaded file'
$r = Api 'reject-exe' POST "/workspaces/$workspaceA/tasks/$taskA/attachments/presign" @{filename='payload.exe';mimeType='application/x-msdownload';size=12} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 400

WaitEmailCooldown
$sinceB = (Get-Date).ToUniversalTime()
$r = Api 'register-B' POST '/auth/register' @{email=$userB;password=$pass} $jarB $null; Show $r; AssertStatus $r 201
$verificationUrlB = WaitMail $userB 'Verify your Cloud SaaS email' $sinceB
$r = Api 'verify-B' GET ("/auth/verify-email?token=" + [Uri]::EscapeDataString((TokenFromUrl $verificationUrlB))) $null $jarB $null; Show $r
$r = Api 'login-B' POST '/auth/login' @{email=$userB;password=$pass} $jarB $null; Show $r
$inviteSince = (Get-Date).ToUniversalTime(); WaitEmailCooldown
$r = Api 'invite-B' POST "/workspaces/$workspaceA/invitations" @{email=$userB;role='member'} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 201
$inviteUrl = WaitMail $userB 'You have been invited to Cloud SaaS' $inviteSince
$r = Api 'accept-B' POST '/workspaces/invitations/accept' @{token=(TokenFromUrl $inviteUrl)} $jarB ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 201
$members = Api 'members' GET "/workspaces/$workspaceA/members" $null $jarA $null; Show $members; AssertStatus $members 200
$userBId = (@($members.body.items) | Where-Object { $_.email -eq $userB }).id
WaitEmailCooldown
$assignSince = (Get-Date).ToUniversalTime()
$r = Api 'assign-B' PATCH "/workspaces/$workspaceA/tasks/$taskA" @{assigneeId=$userBId} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 200
$r = Api 'comment' POST "/workspaces/$workspaceA/tasks/$taskA/comments" @{body='Phase 4 comment'} $jarA ([guid]::NewGuid().ToString()); Show $r; AssertStatus $r 201
$inbox = Api 'inbox-B' GET "/workspaces/$workspaceA/notifications?limit=20" $null $jarB $null; Show $inbox; AssertStatus $inbox 200
AssertTrue (@($inbox.body.items | Where-Object { $_.type -eq 'task_assigned' }).Count -ge 1) 'assignee received an in-app notification'
$null = WaitMail $userB 'You were assigned a task' $assignSince
$audit = Api 'audit' GET "/workspaces/$workspaceA/audit-events?limit=20" $null $jarA $null; Show $audit; AssertStatus $audit 200
AssertTrue (@($audit.body.items | Where-Object { $_.entity_type -eq 'attachment' }).Count -ge 1) 'audit log includes attachment events'
Write-Output "PHASE4_ASSERTIONS=passed`nUSER_A=$userA`nUSER_B=$userB`nWORKSPACE_A=$workspaceA`nTASK_A=$taskA`nATTACHMENT_ID=$attachmentId"
