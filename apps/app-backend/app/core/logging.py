import logging
import sys


def setup_logging(level: int = logging.INFO) -> None:
    """Configures structured application logging."""
    root_logger = logging.getLogger()
    if root_logger.handlers:
        return

    root_logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)


logger = logging.getLogger("asi_telemetry")
