use std::sync::Mutex;
use crate::types::RecordingSession;

pub struct AppState {
    pub session: Mutex<Option<RecordingSession>>,
}
