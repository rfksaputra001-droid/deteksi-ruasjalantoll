"""
Logger Utility
"""

import logging
import sys
from datetime import datetime

# Create logger
logger = logging.getLogger("yolo_backend")
logger.setLevel(logging.DEBUG)

# Create console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.DEBUG)

# Create formatter
formatter = logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
console_handler.setFormatter(formatter)

# Add handler to logger
if not logger.handlers:
    logger.addHandler(console_handler)


def info(message: str):
    logger.info(message)


def error(message: str, exc: Exception = None):
    if exc:
        logger.error(f"{message}: {str(exc)}")
    else:
        logger.error(message)


def warning(message: str):
    logger.warning(message)


def debug(message: str):
    logger.debug(message)
