mod models;
mod profile_manager;
mod queue_manager;

use queue_manager::QueueManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let queue_manager = QueueManager::new(2);

    tauri::Builder::default()
        .manage(queue_manager)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Profile & Settings
            profile_manager::save_profile,
            profile_manager::load_profiles,
            profile_manager::delete_profile,
            profile_manager::save_current_settings,
            profile_manager::load_current_settings,

            // Queue & Tasks
            queue_manager::get_tasks,
            queue_manager::add_tasks,
            queue_manager::start_queue,
            queue_manager::pause_queue,
            queue_manager::cancel_queue,
            queue_manager::retry_failed_tasks,
            queue_manager::retry_selected_tasks,
            queue_manager::delete_selected_tasks,
            queue_manager::delete_waiting_tasks,
            queue_manager::clean_done_tasks,
            queue_manager::delete_task,
            queue_manager::open_output_folder,
            queue_manager::open_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
