use core_graphics::display::CGPoint;
use core_graphics::event::CGEvent;
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use tauri::command;

#[derive(serde::Serialize)]
pub struct MousePosition {
    pub x: f64,
    pub y: f64,
}

#[command]
pub fn get_mouse_position() -> Result<MousePosition, String> {
    // Create a null event to get the current cursor position
    let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState)
        .map_err(|_| "Failed to create event source".to_string())?;

    let event = CGEvent::new(source).map_err(|_| "Failed to create event".to_string())?;

    let point: CGPoint = event.location();

    Ok(MousePosition {
        x: point.x,
        y: point.y,
    })
}
