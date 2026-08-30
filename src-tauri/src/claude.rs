//! Reads the local Claude Code OAuth credentials and polls the (undocumented)
//! `/api/oauth/usage` endpoint that Claude Code's own UI uses to show the
//! live 5-hour / 7-day usage windows.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

pub const POLL_INTERVAL_SECS: u64 = 90;

const USAGE_URL: &str = "https://api.anthropic.com/api/oauth/usage";
const OAUTH_BETA_HEADER: &str = "oauth-2025-04-20";
// Mimics the Claude Code CLI's own User-Agent so requests land in the same
// (more lenient) rate-limit bucket the CLI itself uses. This is a guess at
// the real value the CLI sends — Milestone 1's job is to confirm empirically
// whether this actually avoids 429s on a real account, and adjust if not.
const CLAUDE_CLI_USER_AGENT: &str = "claude-cli/2.1.0";

#[derive(Debug, Error)]
pub enum ClaudeError {
    #[error("could not determine home directory")]
    NoHomeDir,
    #[error("credentials file not found at {0}")]
    CredentialsNotFound(PathBuf),
    #[error("failed to read credentials file: {0}")]
    ReadCredentials(#[source] std::io::Error),
    #[error("failed to parse credentials file: {0}")]
    ParseCredentials(#[source] serde_json::Error),
    #[error("access token is expired")]
    TokenExpired,
    #[error("usage request failed: {0}")]
    Request(#[source] reqwest::Error),
    #[error("usage response had unexpected status {0}")]
    UnexpectedStatus(reqwest::StatusCode),
}

#[derive(Debug, Deserialize)]
struct CredentialsFile {
    #[serde(rename = "claudeAiOauth")]
    claude_ai_oauth: OauthCreds,
}

#[derive(Debug, Deserialize)]
struct OauthCreds {
    #[serde(rename = "accessToken")]
    access_token: String,
    /// Unit (ms vs seconds since epoch) is unconfirmed until we see a real
    /// value — see ClaudeError doc / plan risks. Kept as raw i64 here and
    /// interpreted in `is_expired()`.
    #[serde(rename = "expiresAt")]
    expires_at: Option<i64>,
}

pub struct Credentials {
    pub access_token: String,
    pub expires_at_raw: Option<i64>,
}

fn credentials_path() -> Result<PathBuf, ClaudeError> {
    let home = dirs::home_dir().ok_or(ClaudeError::NoHomeDir)?;
    Ok(home.join(".claude").join(".credentials.json"))
}

pub fn read_credentials() -> Result<Credentials, ClaudeError> {
    let path = credentials_path()?;
    if !path.exists() {
        return Err(ClaudeError::CredentialsNotFound(path));
    }
    let raw = std::fs::read_to_string(&path).map_err(ClaudeError::ReadCredentials)?;
    let parsed: CredentialsFile =
        serde_json::from_str(&raw).map_err(ClaudeError::ParseCredentials)?;
    Ok(Credentials {
        access_token: parsed.claude_ai_oauth.access_token,
        expires_at_raw: parsed.claude_ai_oauth.expires_at,
    })
}

/// Best-effort expiry check. Tries the raw value as both seconds and
/// milliseconds since epoch and picks whichever lands in a plausible range
/// (roughly "within the last 20 years" through "within the next 20 years")
/// -- logged loudly so Milestone 1 testing can confirm which one is real
/// and this heuristic can be simplified afterward.
pub fn is_expired(expires_at_raw: Option<i64>) -> bool {
    let Some(raw) = expires_at_raw else {
        return false; // no expiry info: assume valid, let the API call itself fail if not
    };
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_secs() as i64;

    let as_seconds = raw;
    let as_millis_to_seconds = raw / 1000;

    // Prefer whichever interpretation is closer to "now" in plausible range.
    let seconds_plausible = (now - 20 * 365 * 24 * 3600..now + 20 * 365 * 24 * 3600)
        .contains(&as_seconds);
    let millis_plausible = (now - 20 * 365 * 24 * 3600..now + 20 * 365 * 24 * 3600)
        .contains(&as_millis_to_seconds);

    let expires_at_secs = match (seconds_plausible, millis_plausible) {
        (true, false) => as_seconds,
        (false, true) => as_millis_to_seconds,
        // Both plausible or neither: prefer the milliseconds interpretation,
        // since that's what the reference implementation's JSON shape implied.
        _ => as_millis_to_seconds,
    };

    expires_at_secs <= now
}

#[derive(Debug, Deserialize, Default)]
pub struct UsageWindow {
    #[serde(default)]
    pub utilization: Option<f64>,
    #[serde(default)]
    pub resets_at: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct UsageResponse {
    #[serde(default, rename = "five_hour")]
    pub five_hour: Option<UsageWindow>,
    #[serde(default, rename = "seven_day")]
    pub seven_day: Option<UsageWindow>,
}

pub async fn fetch_usage(access_token: &str) -> Result<UsageResponse, ClaudeError> {
    let client = reqwest::Client::new();
    let response = client
        .get(USAGE_URL)
        .bearer_auth(access_token)
        .header("anthropic-beta", OAUTH_BETA_HEADER)
        .header("User-Agent", CLAUDE_CLI_USER_AGENT)
        .send()
        .await
        .map_err(ClaudeError::Request)?;

    let status = response.status();
    if !status.is_success() {
        return Err(ClaudeError::UnexpectedStatus(status));
    }

    // Defensive: log the raw body first so an unexpected shape doesn't just
    // vanish into a generic deserialize error during Milestone 1 testing.
    let body = response.text().await.map_err(ClaudeError::Request)?;
    match serde_json::from_str::<UsageResponse>(&body) {
        Ok(parsed) => Ok(parsed),
        Err(err) => {
            eprintln!("[claude] failed to parse usage response body: {err}\nraw body: {body}");
            Err(ClaudeError::ParseCredentials(err))
        }
    }
}

/// Simplified, serializable snapshot pushed to the frontend. `status`
/// distinguishes "no usable credentials yet" from "have data" so the UI can
/// show a distinct waiting state without guessing from null percentages.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum UiStatus {
    Waiting,
    Ok,
}

/// Mood tiers driving the character's pose, per the agreed 4-tier split.
/// Boundaries intentionally match the 85%/100% toast-alert thresholds so
/// the character and the notifications always agree.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Mood {
    Waiting,
    Calm,
    Busy,
    Anxious,
    Critical,
}

fn mood_for_pct(pct: f64) -> Mood {
    if pct >= 100.0 {
        Mood::Critical
    } else if pct >= 85.0 {
        Mood::Anxious
    } else if pct >= 50.0 {
        Mood::Busy
    } else {
        Mood::Calm
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct UiState {
    pub status: UiStatus,
    pub mood: Mood,
    pub session_pct: Option<f64>,
    pub weekly_pct: Option<f64>,
    /// Per-window mood tier, computed once here from `mood_for_pct` and carried
    /// on the payload so the frontend renders a tier instead of re-deriving one
    /// (`session_pct`/`weekly_pct` alone used to drive a second, independent
    /// threshold check in bars.ts).
    pub session_mood: Option<Mood>,
    pub weekly_mood: Option<Mood>,
    pub session_resets_at: Option<String>,
    pub weekly_resets_at: Option<String>,
    pub last_updated: String,
}

impl UiState {
    pub fn waiting() -> Self {
        Self {
            status: UiStatus::Waiting,
            mood: Mood::Waiting,
            session_pct: None,
            weekly_pct: None,
            session_mood: None,
            weekly_mood: None,
            session_resets_at: None,
            weekly_resets_at: None,
            last_updated: now_iso(),
        }
    }

    pub fn from_usage(usage: &UsageResponse) -> Self {
        let session_pct = usage.five_hour.as_ref().and_then(|w| w.utilization);
        let weekly_pct = usage.seven_day.as_ref().and_then(|w| w.utilization);
        let driving_pct = session_pct.unwrap_or(0.0).max(weekly_pct.unwrap_or(0.0));
        Self {
            status: UiStatus::Ok,
            mood: mood_for_pct(driving_pct),
            session_pct,
            weekly_pct,
            session_mood: session_pct.map(mood_for_pct),
            weekly_mood: weekly_pct.map(mood_for_pct),
            session_resets_at: usage.five_hour.as_ref().and_then(|w| w.resets_at.clone()),
            weekly_resets_at: usage.seven_day.as_ref().and_then(|w| w.resets_at.clone()),
            last_updated: now_iso(),
        }
    }
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// Outcome of one attempt to reach the usage endpoint. Carries just enough to
/// decide the next `UiState` — credential/network causes are logged where
/// they happen (`attempt_fetch`, an I/O boundary), not here.
enum FetchAttempt {
    /// No usable credentials: missing, unreadable, or expired.
    Unavailable,
    /// Credentials were fine but the request itself failed.
    Failed,
    Succeeded(UsageResponse),
}

/// Does the actual I/O for one poll: reads credentials, checks expiry, hits
/// the usage endpoint. Logs the cause at each failure point, then hands off
/// a plain `FetchAttempt` so the next-state decision can be made without any
/// of this I/O.
async fn attempt_fetch() -> FetchAttempt {
    let creds = match read_credentials() {
        Err(err) => {
            eprintln!("[claude] could not read credentials: {err}");
            return FetchAttempt::Unavailable;
        }
        Ok(creds) => creds,
    };

    if is_expired(creds.expires_at_raw) {
        eprintln!("[claude] {}", ClaudeError::TokenExpired);
        return FetchAttempt::Unavailable;
    }

    match fetch_usage(&creds.access_token).await {
        Ok(usage) => FetchAttempt::Succeeded(usage),
        Err(err) => {
            eprintln!("[claude] usage fetch failed, keeping last known state: {err}");
            FetchAttempt::Failed
        }
    }
}

/// The decision the poll loop exists to make: given how the last attempt
/// went and the last known-good state, what should the UI show now? Pure and
/// synchronous, so every branch (no creds, expired, fetch failed with/without
/// a fallback, fetch succeeded) is directly unit-testable below with no
/// network, filesystem, or `AppHandle` involved.
fn resolve_state(attempt: FetchAttempt, last_ok_state: &Option<UiState>) -> UiState {
    match attempt {
        FetchAttempt::Unavailable => UiState::waiting(),
        FetchAttempt::Failed => last_ok_state.clone().unwrap_or_else(UiState::waiting),
        FetchAttempt::Succeeded(usage) => UiState::from_usage(&usage),
    }
}

/// Runs forever: re-reads credentials and polls `/api/oauth/usage` every
/// `POLL_INTERVAL_SECS`, pushing each result to the frontend via the
/// `usage://update` event. Errors are logged and the loop keeps going —
/// a single failed poll should never crash the widget.
pub async fn run_poll_loop(app_handle: tauri::AppHandle) {
    use tauri::Emitter;

    let mut last_ok_state: Option<UiState> = None;

    loop {
        let attempt = attempt_fetch().await;
        let state = resolve_state(attempt, &last_ok_state);
        if matches!(state.status, UiStatus::Ok) {
            last_ok_state = Some(state.clone());
        }

        if let Err(err) = app_handle.emit("usage://update", &state) {
            eprintln!("[claude] failed to emit usage update: {err}");
        }

        tokio::time::sleep(std::time::Duration::from_secs(POLL_INTERVAL_SECS)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn window(pct: f64) -> UsageWindow {
        UsageWindow {
            utilization: Some(pct),
            resets_at: Some("2026-01-01T00:00:00Z".to_string()),
        }
    }

    #[test]
    fn no_credentials_reports_waiting() {
        let state = resolve_state(FetchAttempt::Unavailable, &None);
        assert!(matches!(state.status, UiStatus::Waiting));
    }

    #[test]
    fn failed_fetch_reuses_last_known_state() {
        let last = UiState::from_usage(&UsageResponse {
            five_hour: Some(window(40.0)),
            seven_day: Some(window(10.0)),
        });

        let state = resolve_state(FetchAttempt::Failed, &Some(last.clone()));

        assert!(matches!(state.status, UiStatus::Ok));
        assert_eq!(state.session_pct, last.session_pct);
    }

    #[test]
    fn failed_fetch_without_last_known_state_reports_waiting() {
        let state = resolve_state(FetchAttempt::Failed, &None);
        assert!(matches!(state.status, UiStatus::Waiting));
    }

    #[test]
    fn successful_fetch_derives_state_and_per_window_mood() {
        let usage = UsageResponse {
            five_hour: Some(window(90.0)),
            seven_day: Some(window(20.0)),
        };

        let state = resolve_state(FetchAttempt::Succeeded(usage), &None);

        assert!(matches!(state.status, UiStatus::Ok));
        assert!(matches!(state.mood, Mood::Anxious)); // driven by the 90% window
        assert!(matches!(state.session_mood, Some(Mood::Anxious)));
        assert!(matches!(state.weekly_mood, Some(Mood::Calm)));
    }
}
