use std::fs;
use std::path::PathBuf;
use crate::models::{StudioProfile, StudioSettings};

fn get_config_dir() -> PathBuf {
    let dir = PathBuf::from("./config");
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    dir
}

fn get_profiles_file() -> PathBuf {
    get_config_dir().join("profiles.json")
}

fn get_active_settings_file() -> PathBuf {
    get_config_dir().join("active_settings.json")
}

#[tauri::command]
pub fn save_profile(profile: StudioProfile) -> Result<String, String> {
    let mut profiles = load_profiles().unwrap_or_default();
    
    // Check if profile exists and update or append
    if let Some(pos) = profiles.iter().position(|p| p.name == profile.name) {
        profiles[pos] = profile.clone();
    } else {
        profiles.push(profile.clone());
    }

    let file_path = get_profiles_file();
    let json_data = serde_json::to_string_pretty(&profiles)
        .map_err(|e| format!("Failed to serialize profiles: {}", e))?;

    fs::write(&file_path, json_data)
        .map_err(|e| format!("Failed to write profiles to disk: {}", e))?;

    Ok(format!("Đã lưu thành công profile: {}", profile.name))
}

#[tauri::command]
pub fn load_profiles() -> Result<Vec<StudioProfile>, String> {
    let file_path = get_profiles_file();
    if !file_path.exists() {
        // Return default built-in profiles
        let default_profile = StudioProfile {
            name: "Mặc định".to_string(),
            settings: StudioSettings::default(),
            updated_at: chrono::Local::now().format("%H:%M:%S").to_string(),
        };
        let anim_profile = StudioProfile {
            name: "Truyện Đô Thị Fast".to_string(),
            settings: StudioSettings {
                genre: "Đô thị / Trọng sinh".to_string(),
                voice: "Nam Miền Bắc Trầm Ấm (vi-VN)".to_string(),
                speed: 1.15,
                ..StudioSettings::default()
            },
            updated_at: chrono::Local::now().format("%H:%M:%S").to_string(),
        };
        let reup_douyin = StudioProfile {
            name: "Reup Review Douyin".to_string(),
            settings: StudioSettings {
                genre: "Review Phim".to_string(),
                voice: "Cô Gái Hoạt Ngôn (vi-VN)".to_string(),
                speed: 1.05,
                blur_radius: 30,
                ..StudioSettings::default()
            },
            updated_at: chrono::Local::now().format("%H:%M:%S").to_string(),
        };
        return Ok(vec![default_profile, anim_profile, reup_douyin]);
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read profiles: {}", e))?;
    let profiles: Vec<StudioProfile> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse profiles: {}", e))?;

    Ok(profiles)
}

#[tauri::command]
pub fn delete_profile(name: String) -> Result<String, String> {
    let mut profiles = load_profiles().unwrap_or_default();
    let initial_len = profiles.len();
    profiles.retain(|p| p.name != name);

    if profiles.len() == initial_len {
        return Err(format!("Không tìm thấy profile: {}", name));
    }

    let file_path = get_profiles_file();
    let json_data = serde_json::to_string_pretty(&profiles)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&file_path, json_data)
        .map_err(|e| format!("Failed to write: {}", e))?;

    Ok(format!("Đã xóa profile: {}", name))
}

#[tauri::command]
pub fn save_current_settings(settings: StudioSettings) -> Result<String, String> {
    let file_path = get_active_settings_file();
    let json_data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&file_path, json_data)
        .map_err(|e| format!("Failed to write active settings: {}", e))?;

    let now_time = chrono::Local::now().format("%H:%M:%S").to_string();
    Ok(now_time)
}

#[tauri::command]
pub fn load_current_settings() -> Result<StudioSettings, String> {
    let file_path = get_active_settings_file();
    if !file_path.exists() {
        return Ok(StudioSettings::default());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read active settings: {}", e))?;
    let settings: StudioSettings = serde_json::from_str(&content)
        .unwrap_or_default();

    Ok(settings)
}
