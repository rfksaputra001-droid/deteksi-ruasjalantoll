import cv2
from ultralytics import YOLO
from collections import defaultdict

# =================== CONFIG ===================
MODEL_PATH = "runs/detect/vehicle_night2/weights/best.pt"
VIDEO_PATH = "video/malam.mp4"
LINE_POSITION = 300        # posisi garis horizontal (DINAIKKAN JAUH KE ATAS!)
OFFSET = 40                # toleransi untuk crossing
MIN_FRAMES_BEFORE_COUNT = 1  # minimal frame tracking sebelum bisa dihitung (lebih agresif)
FRAME_WIDTH = 1280         # update sesuai video asli
# ============================================

# Load model YOLOv8 dengan tracking
model = YOLO(MODEL_PATH)

# Class mapping
class_map = {0: 'mobil', 1: 'bus', 2: 'truk'}

# Counters
counters = {
    'kiri': {'total': 0, 'mobil': 0, 'bus': 0, 'truk': 0},
    'kanan': {'total': 0, 'mobil': 0, 'bus': 0, 'truk': 0}
}
vehicle_count_total = 0

# Track status setiap kendaraan
# Format: {track_id: {'counted': False, 'prev_y': None, 'class': None, 'lane': None, 'frame_count': 0}}
vehicle_status = defaultdict(lambda: {
    'counted': False, 
    'prev_y': None, 
    'class': None, 
    'lane': None, 
    'frame_count': 0,
    'y_history': []
})

def get_lane(cx, frame_width):
    """Tentukan lajur berdasarkan posisi x centroid"""
    mid_point = frame_width // 2
    if cx < mid_point:
        return 'kiri'
    else:
        return 'kanan'

def check_line_crossing(y_history, line_y, offset=OFFSET, is_first_detection=False, curr_y=None):
    """
    Cek apakah kendaraan melewati garis berdasarkan history posisi
    Return: True jika crossing terjadi
    """
    if len(y_history) < 1:
        return False
    
    # KONDISI KHUSUS: Jika baru terdeteksi dan sudah di bawah garis
    # Asumsi: kendaraan sudah lewat tapi baru terdeteksi
    if is_first_detection and curr_y is not None:
        if curr_y > line_y and curr_y < (line_y + 200):  # Dalam 200 pixel dari garis
            return True
    
    if len(y_history) < 2:
        return False
    
    # Ambil semua posisi untuk deteksi lebih robust
    prev_y = y_history[-2]
    curr_y = y_history[-1]
    
    # KONDISI 1: Crossing sederhana - dari atas ke bawah melewati garis
    if prev_y <= line_y and curr_y > line_y:
        return True
    
    # KONDISI 2: Dengan offset - lebih toleran
    if prev_y < (line_y + offset) and curr_y >= (line_y + offset):
        return True
    
    # KONDISI 3: Jika posisi sebelumnya di atas dan sekarang jauh di bawah (kendaraan cepat)
    if prev_y < line_y and curr_y > (line_y + offset):
        return True
    
    # KONDISI 4: Cek dari history lebih panjang (jika ada gap deteksi)
    if len(y_history) >= 3:
        prev_prev_y = y_history[-3]
        # Jika 2 frame lalu di atas, sekarang di bawah
        if prev_prev_y < line_y and curr_y > line_y:
            return True
    
    return False

# Buka video
cap = cv2.VideoCapture(VIDEO_PATH)

# Cek apakah video berhasil dibuka
if not cap.isOpened():
    print(f"Error: Tidak dapat membuka video {VIDEO_PATH}")
    exit()

frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_count += 1
    h, w, _ = frame.shape
    
    # Deteksi dengan tracking - turunkan conf dan ubah IOU
    results = model.track(frame, persist=True, conf=0.2, iou=0.3, tracker="botsort.yaml", verbose=False)
    
    # Gambar garis hitung - SATU GARIS SAJA!
    # Garis utama (merah tebal)
    cv2.line(frame, (0, LINE_POSITION), (w, LINE_POSITION), (0, 0, 255), 5)
    
    # Text di atas garis
    cv2.putText(frame, "==== COUNTING LINE ====", (w//2 - 150, LINE_POSITION - 15), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    
    # Text di bawah garis
    cv2.putText(frame, f"Y = {LINE_POSITION} pixels", (w//2 - 80, LINE_POSITION + 25), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    # GARIS PEMBATAS LAJUR (vertikal di tengah)
    mid_x = w // 2
    cv2.line(frame, (mid_x, 0), (mid_x, h), (255, 0, 255), 3)
    cv2.putText(frame, "KIRI", (mid_x - 150, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 0, 255), 3)
    cv2.putText(frame, "KANAN", (mid_x + 50, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 0, 255), 3)
    
    # Cek apakah ada deteksi
    if results[0].boxes is not None and results[0].boxes.id is not None:
        boxes = results[0].boxes.xyxy.cpu().numpy()
        track_ids = results[0].boxes.id.cpu().numpy().astype(int)
        classes = results[0].boxes.cls.cpu().numpy().astype(int)
        
        for box, track_id, cls_id in zip(boxes, track_ids, classes):
            x1, y1, x2, y2 = map(int, box)
            cls_name = class_map.get(cls_id, 'unknown')
            
            # Hitung centroid
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            
            # Ambil status kendaraan ini
            status = vehicle_status[track_id]
            
            # Cek apakah ini deteksi pertama kali
            is_first_detection = (status['frame_count'] == 0)
            
            # Update frame count dan history
            status['frame_count'] += 1
            status['y_history'].append(cy)
            
            # Batasi history hanya 15 frame terakhir (lebih panjang untuk deteksi gap)
            if len(status['y_history']) > 15:
                status['y_history'].pop(0)
            
            # Tentukan lajur
            lane = get_lane(cx, w)
            status['lane'] = lane
            status['class'] = cls_name
            
            # DEBUG: Print posisi setiap kendaraan di lajur kiri
            if lane == 'kiri' and not status['counted']:
                print(f"[DEBUG KIRI] ID={track_id}, Y={cy}, LINE={LINE_POSITION}, First={is_first_detection}, History={status['y_history'][-3:]}")
            
            # Cek crossing jika:
            # 1. Belum pernah dihitung
            # 2. Sudah ter-track minimal beberapa frame (untuk stabilitas) ATAU baru terdeteksi tapi sudah lewat garis
            # 3. Posisi y-nya melewati zona counting
            if not status['counted']:
                is_crossing = check_line_crossing(status['y_history'], LINE_POSITION, OFFSET, is_first_detection, cy)
                
                # DEBUG: Print hasil cek crossing untuk lajur kiri
                if lane == 'kiri':
                    print(f"[DEBUG KIRI] ID={track_id}, Crossing Check: {is_crossing}, Frames={status['frame_count']}")
                
                if is_crossing:
                    # Kendaraan melewati garis!
                    status['counted'] = True
                    counters[lane]['total'] += 1
                    counters[lane][cls_name] += 1
                    vehicle_count_total += 1
                    
                    print(f"✓✓✓ COUNTED: ID={track_id}, Class={cls_name}, Lane={lane.upper()}, X={cx}, Y={cy}, Frame={frame_count}")
                    print(f"   History Y: {status['y_history'][-5:]}")  # Print 5 posisi terakhir
                    print(f"   Counter Kiri: {counters['kiri']['total']}, Kanan: {counters['kanan']['total']}")
                    
                    # Visual feedback saat counting (lebih mencolok)
                    cv2.circle(frame, (cx, cy), 20, (0, 255, 0), -1)
                    cv2.circle(frame, (cx, cy), 25, (0, 255, 0), 3)
                    cv2.putText(frame, f"COUNTED! {lane.upper()}", (cx - 60, cy - 30), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 3)
            
            # Update posisi y sebelumnya
            status['prev_y'] = cy
            
            # Gambar bounding box dengan warna berbeda
            if status['counted']:
                color = (0, 255, 0)  # Hijau - sudah dihitung
                thickness = 3
            else:
                # Warna berbeda untuk lajur kiri (untuk debug)
                if lane == 'kiri':
                    color = (255, 0, 255)  # Magenta - lajur kiri belum dihitung
                else:
                    color = (255, 0, 0)  # Biru - lajur kanan belum dihitung
                thickness = 2
                
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)
            
            # Label dengan informasi lengkap
            label = f"ID:{track_id} {cls_name} X:{cx} Y:{cy} [{lane.upper()}]"
            if status['counted']:
                label = f"ID:{track_id} {cls_name} [{lane.upper()}] ✓"
                
            # Background untuk label
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 2)[0]
            cv2.rectangle(frame, (x1, y1 - 25), (x1 + label_size[0] + 5, y1), color, -1)
            cv2.putText(frame, label, (x1, y1 - 8), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 2)
            
            # Gambar centroid
            cv2.circle(frame, (cx, cy), 5, (0, 255, 255), -1)
            
            # Gambar garis dari centroid ke counting line untuk debug
            if not status['counted']:
                cv2.line(frame, (cx, cy), (cx, LINE_POSITION), (255, 255, 0), 1)
    
    # Tampilkan counter dengan background
    overlay = frame.copy()
    cv2.rectangle(overlay, (5, 5), (350, 200), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
    
    y0 = 30
    for lane_name in ['kiri', 'kanan']:
        cv2.putText(frame, f"Lajur {lane_name.capitalize()}: {counters[lane_name]['total']}", 
                   (10, y0), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        y0 += 30
        for cls in ['mobil', 'bus', 'truk']:
            cv2.putText(frame, f"  {cls.capitalize()}: {counters[lane_name][cls]}", 
                       (15, y0), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            y0 += 20
        y0 += 5
    
    cv2.putText(frame, f"TOTAL: {vehicle_count_total}", 
               (10, y0 + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    
    # Info frame
    cv2.putText(frame, f"Frame: {frame_count}", (w - 150, 30), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    # Tampilkan frame
    cv2.imshow("Vehicle Counter", frame)
    
    # Kontrol
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('p'):  # Pause
        cv2.waitKey(0)
    elif key == ord('r'):  # Reset counter
        counters = {
            'kiri': {'total': 0, 'mobil': 0, 'bus': 0, 'truk': 0},
            'kanan': {'total': 0, 'mobil': 0, 'bus': 0, 'truk': 0}
        }
        vehicle_count_total = 0
        vehicle_status.clear()
        print("Counter direset!")

cap.release()
cv2.destroyAllWindows()

# Print summary
print("\n" + "="*50)
print("SUMMARY HASIL COUNTING")
print("="*50)
for lane in ['kiri', 'kanan']:
    print(f"\nLajur {lane.capitalize()}:")
    print(f"  Total: {counters[lane]['total']}")
    for cls in ['mobil', 'bus', 'truk']:
        print(f"  {cls.capitalize()}: {counters[lane][cls]}")
print(f"\nGRAND TOTAL: {vehicle_count_total}")
print("="*50)