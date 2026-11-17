"""Ponto de entrada para hospedagem (gunicorn, PythonAnywhere, Render...).

Exemplo:  gunicorn --chdir backend wsgi:application
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app as application  # noqa: E402
