use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::{Mutex, Semaphore};
use tauri::{AppHandle, Emitter};

use crate::models::{LiveLogEvent, TaskItem, TaskProgressEvent};
use crate::profile_manager::load_current_settings;

pub struct QueueState {
    pub is_running: bool,
    pub is_paused: bool,
    pub tasks: Vec<TaskItem>,
    pub concurrency_limit: usize,
}

#[derive(Clone)]
pub struct QueueManager {
    pub inner: Arc<Mutex<QueueState>>,
    semaphore: Arc<Semaphore>,
    capcut_lock: Arc<Mutex<()>>,
}

impl QueueManager {
    pub fn new(concurrency_limit: usize) -> Self {
        let default_tasks = vec![
            TaskItem {
                id: 17,
                name: "17".to_string(),
                source: "Episode_17".to_string(),
                stage: "Hoàn tất".to_string(),
                progress: 100,
                status: "DONE".to_string(),
                note: "Render hoàn tất không lỗi".to_string(),
                output_path: "C:\\Output\\Reup_17.mp4".to_string(),
                selected: false,
            },
            TaskItem {
                id: 18,
                name: "18".to_string(),
                source: "Episode_18".to_string(),
                stage: "Hoàn tất".to_string(),
                progress: 100,
                status: "DONE".to_string(),
                note: "Render hoàn tất không lỗi".to_string(),
                output_path: "C:\\Output\\Reup_18.mp4".to_string(),
                selected: false,
            },
            TaskItem {
                id: 19,
                name: "19".to_string(),
                source: "Episode_19".to_string(),
                stage: "Hoàn tất".to_string(),
                progress: 100,
                status: "DONE".to_string(),
                note: "Render hoàn tất không lỗi".to_string(),
                output_path: "C:\\Output\\Reup_19.mp4".to_string(),
                selected: false,
            },
            TaskItem {
                id: 20,
                name: "20".to_string(),
                source: "https://v.douyin.com/iRxx20/".to_string(),
                stage: "Lấy phụ đề".to_string(),
                progress: 28,
                status: "SUBTITLE".to_string(),
                note: "Đang trích xuất audio & chạy Whisper...".to_string(),
                output_path: "C:\\Output\\Reup_20.mp4".to_string(),
                selected: true,
            },
            TaskItem {
                id: 21,
                name: "21".to_string(),
                source: "https://v.douyin.com/iRxx21/".to_string(),
                stage: "Chờ chạy".to_string(),
                progress: 0,
                status: "WAITING".to_string(),
                note: "Nằm trong hàng đợi tiến trình".to_string(),
                output_path: "C:\\Output\\Reup_21.mp4".to_string(),
                selected: false,
            },
        ];

        Self {
            inner: Arc::new(Mutex::new(QueueState {
                is_running: false,
                is_paused: false,
                tasks: default_tasks,
                concurrency_limit,
            })),
            semaphore: Arc::new(Semaphore::new(concurrency_limit)),
            capcut_lock: Arc::new(Mutex::new(())),
        }
    }

    pub async fn calculate_stats(&self) -> (usize, usize, f64, String) {
        let state = self.inner.lock().await;
        let total = state.tasks.len();
        if total == 0 {
            return (0, 0, 0.0, "0m 00s".to_string());
        }
        let processed = state.tasks.iter().filter(|t| t.status == "DONE").count();
        let total_progress: u32 = state.tasks.iter().map(|t| t.progress).sum();
        let percent = (total_progress as f64) / (total as f64);
        let remaining = total.saturating_sub(processed);
        let mins = remaining * 2;
        let secs = 15;
        (processed, total, percent, format!("{}m {}s", mins, secs))
    }

    pub async fn emit_log(&self, app: &AppHandle, message: &str, log_type: &str) {
        let event = LiveLogEvent {
            id: format!("{}", chrono::Local::now().timestamp_nanos_opt().unwrap_or(0)),
            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
            message: message.to_string(),
            log_type: log_type.to_string(),
        };
        let _ = app.emit("live-log", event);
    }
}

// ==================== TAURI COMMANDS ====================

#[tauri::command]
pub async fn get_tasks(queue: tauri::State<'_, QueueManager>) -> Result<Vec<TaskItem>, String> {
    let state = queue.inner.lock().await;
    Ok(state.tasks.clone())
}

#[tauri::command]
pub async fn add_tasks(
    items: Vec<String>,
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<Vec<TaskItem>, String> {
    let mut state = queue.inner.lock().await;
    let base_id = chrono::Local::now().timestamp_millis() as u64;

    for (idx, item) in items.into_iter().enumerate() {
        let item_trim = item.trim().to_string();
        if item_trim.is_empty() {
            continue;
        }

        let name = if let Some(last_seg) = item_trim.split(['/', '\\']).filter(|s| !s.is_empty()).last() {
            last_seg.trim_end_matches(".mp4").to_string()
        } else {
            format!("Video_{}", base_id + idx as u64)
        };

        let new_task = TaskItem {
            id: base_id + idx as u64,
            name: name.clone(),
            source: item_trim,
            stage: "Chờ chạy".to_string(),
            progress: 0,
            status: "WAITING".to_string(),
            note: "Vừa thêm vào hàng đợi".to_string(),
            output_path: format!("C:\\Output\\Reup_{}.mp4", name),
            selected: false,
        };
        state.tasks.push(new_task);
    }

    let count = state.tasks.len();
    queue.emit_log(&app, &format!("+ Đã thêm các mục mới vào hàng đợi (Tổng: {} video)", count), "info").await;
    Ok(state.tasks.clone())
}

#[tauri::command]
pub async fn start_queue(
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<bool, String> {
    {
        let mut state = queue.inner.lock().await;
        if state.is_running && !state.is_paused {
            return Ok(true);
        }
        state.is_running = true;
        state.is_paused = false;
    }

    queue.emit_log(&app, "▶ KÍCH HOẠT HÀNG ĐỢI ĐA LUỒNG TỰ ĐỘNG CHẠY.", "success").await;

    let q_clone = queue.inner.clone();
    let sem = queue.semaphore.clone();
    let app_handle = app.clone();
    let queue_helper = queue.inner.clone();

    // Spawn async background runner loop
    tokio::spawn(async move {
        loop {
            // Check if queue stopped or paused
            {
                let state = q_clone.lock().await;
                if !state.is_running || state.is_paused {
                    break;
                }
            }

            // Find next WAITING task
            let next_task = {
                let mut state = q_clone.lock().await;
                state.tasks.iter_mut().find(|t| t.status == "WAITING").map(|t| {
                    t.status = "PROCESSING".to_string();
                    t.stage = "Bắt đầu...".to_string();
                    t.clone()
                })
            };

            match next_task {
                Some(task) => {
                    let permit = sem.clone().acquire_owned().await.unwrap();
                    let q_state = q_clone.clone();
                    let app_h = app_handle.clone();
                    let capcut_l = queue.capcut_lock.clone();

                    tokio::spawn(async move {
                        let _permit = permit;
                        process_single_task(task, q_state, app_h, capcut_l).await;
                    });
                }
                None => {
                    // Check if any task is still PROCESSING or SUBTITLE
                    let still_working = {
                        let state = q_clone.lock().await;
                        state.tasks.iter().any(|t| t.status == "PROCESSING" || t.status == "SUBTITLE")
                    };
                    if !still_working {
                        let mut state = q_clone.lock().await;
                        state.is_running = false;
                        let log = LiveLogEvent {
                            id: format!("{}", chrono::Local::now().timestamp_nanos_opt().unwrap_or(0)),
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            message: "✔ Hàng đợi hoàn tất! Tất cả các video đã được xuất.".to_string(),
                            log_type: "success".to_string(),
                        };
                        let _ = app_handle.emit("live-log", log);
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
            }
        }
    });

    Ok(true)
}

#[tauri::command]
pub async fn pause_queue(
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<bool, String> {
    let mut state = queue.inner.lock().await;
    state.is_paused = !state.is_paused;
    let is_paused = state.is_paused;

    let msg = if is_paused {
        "⏸ Đã tạm dừng hàng đợi. Các tác vụ đang chạy dở sẽ hoàn tất."
    } else {
        "▶ Tiếp tục hàng đợi."
    };
    queue.emit_log(&app, msg, "warn").await;
    Ok(is_paused)
}

#[tauri::command]
pub async fn cancel_queue(
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<bool, String> {
    let mut state = queue.inner.lock().await;
    state.is_running = false;
    state.is_paused = false;

    for task in state.tasks.iter_mut() {
        if task.status == "PROCESSING" || task.status == "SUBTITLE" {
            task.status = "CANCELED".to_string();
            task.stage = "Đã hủy".to_string();
        }
    }

    queue.emit_log(&app, "⏹ ĐÃ HỦY TOÀN BỘ HÀNG ĐỢI ĐANG CHẠY.", "error").await;
    Ok(true)
}

#[tauri::command]
pub async fn retry_failed_tasks(
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<usize, String> {
    let mut state = queue.inner.lock().await;
    let mut count = 0;
    for task in state.tasks.iter_mut() {
        if task.status == "ERROR" || task.status == "CANCELED" {
            task.status = "WAITING".to_string();
            task.stage = "Chờ chạy".to_string();
            task.progress = 0;
            count += 1;
        }
    }
    queue.emit_log(&app, &format!("⟳ Đã đưa {} mục lỗi/hủy về trạng thái chờ chạy.", count), "info").await;
    Ok(count)
}

#[tauri::command]
pub async fn retry_selected_tasks(
    ids: Vec<u64>,
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<usize, String> {
    let mut state = queue.inner.lock().await;
    let mut count = 0;
    for task in state.tasks.iter_mut() {
        if ids.contains(&task.id) {
            task.status = "WAITING".to_string();
            task.stage = "Chờ chạy".to_string();
            task.progress = 0;
            count += 1;
        }
    }
    queue.emit_log(&app, &format!("⟳ Đã đưa {} mục đã chọn về trạng thái chờ chạy.", count), "info").await;
    Ok(count)
}

#[tauri::command]
pub async fn delete_selected_tasks(
    ids: Vec<u64>,
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<usize, String> {
    let mut state = queue.inner.lock().await;
    let initial_len = state.tasks.len();
    state.tasks.retain(|t| !ids.contains(&t.id));
    let deleted = initial_len - state.tasks.len();
    queue.emit_log(&app, &format!("Đã xóa {} mục đã chọn khỏi danh sách.", deleted), "warn").await;
    Ok(deleted)
}

#[tauri::command]
pub async fn delete_waiting_tasks(
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<usize, String> {
    let mut state = queue.inner.lock().await;
    let initial_len = state.tasks.len();
    state.tasks.retain(|t| t.status != "WAITING");
    let deleted = initial_len - state.tasks.len();
    queue.emit_log(&app, &format!("Đã xóa {} mục đang chờ.", deleted), "warn").await;
    Ok(deleted)
}

#[tauri::command]
pub async fn clean_done_tasks(
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<usize, String> {
    let mut state = queue.inner.lock().await;
    let initial_len = state.tasks.len();
    state.tasks.retain(|t| t.status != "DONE");
    let deleted = initial_len - state.tasks.len();
    queue.emit_log(&app, &format!("Đã dọn {} mục đã hoàn tất.", deleted), "info").await;
    Ok(deleted)
}

#[tauri::command]
pub async fn delete_task(
    id: u64,
    queue: tauri::State<'_, QueueManager>,
    app: AppHandle,
) -> Result<bool, String> {
    let mut state = queue.inner.lock().await;
    state.tasks.retain(|t| t.id != id);
    queue.emit_log(&app, &format!("Đã xóa video #{} khỏi danh sách.", id), "warn").await;
    Ok(true)
}

#[tauri::command]
pub fn open_output_folder(path: Option<String>) -> Result<(), String> {
    let target = path.unwrap_or_else(|| "C:\\Output".to_string());
    let _ = std::fs::create_dir_all(&target);
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&target)
            .spawn()
            .map_err(|e| format!("Không thể mở thư mục: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Không thể mở file: {}", e))?;
    }
    Ok(())
}

// ==================== WORKER PROCESSOR ====================
async fn process_single_task(
    task: TaskItem,
    q_state: Arc<Mutex<QueueState>>,
    app: AppHandle,
    capcut_lock: Arc<Mutex<()>>,
) {
    let settings = load_current_settings().unwrap_or_default();
    let config_json = serde_json::to_string(&settings).unwrap_or_else(|_| "{}".to_string());
    let task_id = task.id;

    // Log start
    let start_log = LiveLogEvent {
        id: format!("{}", chrono::Local::now().timestamp_nanos_opt().unwrap_or(0)),
        timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
        message: format!("[Video {}] Bắt đầu khởi chạy pipeline xử lý...", task.name),
        log_type: "info".to_string(),
    };
    let _ = app.emit("live-log", start_log);

    // Call python worker
    let worker_script = "./python-worker/pipeline_worker.py";
    let mut cmd = Command::new("python");
    cmd.arg(worker_script)
        .arg("--task-id").arg(format!("{}", task_id))
        .arg("--source").arg(&task.source)
        .arg("--output-dir").arg(&settings.output_dir)
        .arg("--config").arg(&config_json)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    match cmd.spawn() {
        Ok(mut child) => {
            let stdout = child.stdout.take().expect("Failed to open child stdout");
            let mut reader = BufReader::new(stdout).lines();

            while let Ok(Some(line)) = reader.next_line().await {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                    let event_type = val["type"].as_str().unwrap_or("");
                    let progress = val["progress"].as_u64().unwrap_or(0) as u32;
                    let stage = val["stage"].as_str().unwrap_or("Đang xử lý").to_string();
                    let msg = val["message"].as_str().unwrap_or("").to_string();
                    let output_path = val["output_path"].as_str().unwrap_or(&task.output_path).to_string();

                    // Update in memory state
                    let (status, stats) = {
                        let mut state = q_state.lock().await;
                        let s = if event_type == "done" {
                            "DONE"
                        } else if event_type == "error" {
                            "ERROR"
                        } else if stage.contains("phụ đề") {
                            "SUBTITLE"
                        } else {
                            "PROCESSING"
                        };

                        if let Some(t) = state.tasks.iter_mut().find(|t| t.id == task_id) {
                            t.progress = progress;
                            t.stage = stage.clone();
                            t.status = s.to_string();
                            t.note = msg.clone();
                            if !output_path.is_empty() {
                                t.output_path = output_path.clone();
                            }
                        }

                        let total = state.tasks.len();
                        let done_cnt = state.tasks.iter().filter(|t| t.status == "DONE").count();
                        let sum_p: u32 = state.tasks.iter().map(|t| t.progress).sum();
                        let percent = if total > 0 { (sum_p as f64) / (total as f64) } else { 0.0 };
                        let mins = total.saturating_sub(done_cnt) * 2;
                        (s.to_string(), (done_cnt, total, percent, format!("{}m 15s", mins)))
                    };

                    // Emit event to React UI
                    let progress_ev = TaskProgressEvent {
                        task_id,
                        stage: stage.clone(),
                        progress,
                        status: status.clone(),
                        note: msg.clone(),
                        output_path: output_path.clone(),
                        global_processed: stats.0,
                        global_total: stats.1,
                        global_percent: stats.2,
                        estimated_time: stats.3,
                    };
                    let _ = app.emit("task-progress", progress_ev);

                    // Emit live log
                    if !msg.is_empty() {
                        let log_type = if event_type == "done" {
                            "success"
                        } else if event_type == "error" {
                            "error"
                        } else {
                            "info"
                        };
                        let log_ev = LiveLogEvent {
                            id: format!("{}", chrono::Local::now().timestamp_nanos_opt().unwrap_or(0)),
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            message: format!("[Video {}] {}", task.name, msg),
                            log_type: log_type.to_string(),
                        };
                        let _ = app.emit("live-log", log_ev);
                    }
                }
            }

            let _ = child.wait().await;
        }
        Err(e) => {
            let mut state = q_state.lock().await;
            if let Some(t) = state.tasks.iter_mut().find(|t| t.id == task_id) {
                t.status = "ERROR".to_string();
                t.note = format!("Lỗi khởi chạy python worker: {}", e);
            }
            let err_log = LiveLogEvent {
                id: format!("{}", chrono::Local::now().timestamp_nanos_opt().unwrap_or(0)),
                timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                message: format!("[Video {}] Lỗi không thể spawn Python: {}", task.name, e),
                log_type: "error".to_string(),
            };
            let _ = app.emit("live-log", err_log);
        }
    }
}

