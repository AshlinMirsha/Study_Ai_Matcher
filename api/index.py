"""
Vercel Python serverless entry point.
Vercel looks for a callable named `app` or `application` in api/index.py.
"""

import os
import sys

# Add the backend directory to Python path so Django can find its modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()
