use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudioSettings {
    pub genre: String,
    pub translation_quality: String,
    pub voice: String,
    pub speed: f64,
    pub voice_volume: i32,
    pub original_audio_volume: i32,
    pub sub_cover_method: String,
    pub blur_radius: i32,
    pub sub_template: String,
    pub font_size: i32,
    pub text_color: String,
    pub stroke_color: String,
    pub old_sub_blur_box: BoundingBox,
    pub new_sub_box: BoundingBox,
    pub gemini_api_key: String,
    pub groq_api_key: String,
    pub douyin_cookie: String,
    pub output_dir: String,
}

impl Default for StudioSettings {
    fn default() -> Self {
        Self {
            genre: "Tự động".to_string(),
            translation_quality: "Tự nhiên / văn nói".to_string(),
            voice: "Cô Gái Hoạt Ngôn (vi-VN)".to_string(),
            speed: 1.0,
            voice_volume: 100,
            original_audio_volume: 20,
            sub_cover_method: "Làm mờ (Blur)".to_string(),
            blur_radius: 25,
            sub_template: "DEFAULT".to_string(),
            font_size: 25,
            text_color: "#f59e0b".to_string(),
            stroke_color: "#000000".to_string(),
            old_sub_blur_box: BoundingBox {
                x: 18.0,
                y: 72.0,
                width: 32.0,
                height: 9.0,
            },
            new_sub_box: BoundingBox {
                x: 20.0,
                y: 78.0,
                width: 60.0,
                height: 11.0,
            },
            gemini_api_key: "".to_string(),
            groq_api_key: "".to_string(),
            douyin_cookie: "".to_string(),
            output_dir: "C:\\Output".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudioProfile {
    pub name: String,
    pub settings: StudioSettings,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskItem {
    pub id: u64,
    pub name: String,
    pub source: String,
    pub stage: String,
    pub progress: u32,
    pub status: String, // "WAITING", "PROCESSING", "SUBTITLE", "DONE", "ERROR", "CANCELED"
    pub note: String,
    pub output_path: String,
    pub selected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskProgressEvent {
    pub task_id: u64,
    pub stage: String,
    pub progress: u32,
    pub status: String,
    pub note: String,
    pub output_path: String,
    pub global_processed: usize,
    pub global_total: usize,
    pub global_percent: f64,
    pub estimated_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveLogEvent {
    pub id: String,
    pub timestamp: String,
    pub message: String,
    pub log_type: String, // "info", "success", "warn", "error"
}
