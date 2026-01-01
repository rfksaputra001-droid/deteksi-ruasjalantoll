"""
Application Constants - PKJI 2023 Standards
"""

# Kapasitas dasar (C0) per tipe jalan (smp/jam/lajur)
KAPASITAS_DASAR = {
    '4/2 D': 1650,    # 4 lajur 2 arah dengan median
    '4/2 UD': 1500,   # 4 lajur 2 arah tanpa median
    '2/2 UD': 2900,   # 2 lajur 2 arah tanpa median (total 2 arah)
    '6/2 D': 1650,    # 6 lajur 2 arah dengan median
    '8/2 D': 1650,    # 8 lajur 2 arah dengan median
}

# Faktor penyesuaian kapasitas lebar lajur (FCw)
FAKTOR_LEBAR = {
    2.75: 0.91,
    3.00: 0.96,
    3.25: 0.99,
    3.50: 1.00,
    3.75: 1.02,
    4.00: 1.04,
}

# Faktor penyesuaian kapasitas pemisah arah (FCsp)
FAKTOR_PEMISAH = {
    '50-50': 1.00,
    '55-45': 0.97,
    '60-40': 0.94,
    '65-35': 0.91,
    '70-30': 0.88,
}

# Faktor penyesuaian kapasitas hambatan samping (FCsf)
FAKTOR_HAMBATAN = {
    'sangat rendah': 1.02,
    'rendah': 1.00,
    'sedang': 0.97,
    'tinggi': 0.93,
    'sangat tinggi': 0.88,
}

# Faktor penyesuaian kapasitas ukuran kota (FCcs)
FAKTOR_KOTA = {
    'kecil': 0.86,      # < 0.1 juta
    'sedang': 0.90,     # 0.1-0.5 juta
    'besar': 0.94,      # 0.5-1.0 juta
    'sangat besar': 1.00, # > 1.0 juta
}

# Ekivalensi Mobil Penumpang (EMP) - PKJI 2023
EMP = {
    'mobil': 1.0,
    'bus': 1.2,
    'truk': 1.3,
    'motor': 0.25,
    'sepeda': 0.2,
}

# LOS thresholds based on DJ (Derajat Jenuh)
LOS_THRESHOLDS = {
    'A': {'max': 0.20, 'desc': 'Arus bebas dengan kecepatan tinggi'},
    'B': {'max': 0.44, 'desc': 'Arus stabil, kecepatan mulai dibatasi'},
    'C': {'max': 0.72, 'desc': 'Arus stabil, kecepatan dikendalikan'},
    'D': {'max': 0.84, 'desc': 'Arus mendekati tidak stabil'},
    'E': {'max': 0.92, 'desc': 'Arus tidak stabil, terjadi kemacetan'},
    'F': {'max': 1.00, 'desc': 'Arus dipaksa atau macet'},
}

# YOLO Detection constants
YOLO_CONFIG = {
    'CONF_THRESHOLD': 0.15,
    'IOU_THRESHOLD': 0.25,
    'RESIZE_WIDTH': 960,
    'FRAME_SKIP': 1,
    'OFFSET': 60,
    'MAX_TRACKING_FRAMES': 60,
    'MIN_DETECTION_FRAMES': 2,
    'DOT_SPACING': 30,
    'CATCH_UP_ZONE': 100,
    'MIN_TRACK_DISTANCE': 30,
    'MAX_FRAMES_SINCE_LINE': 15,
}

# Video processing
MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024  # 5GB
ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/x-matroska']
