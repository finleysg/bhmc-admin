import os

from django.core.wsgi import get_wsgi_application

settings_file = os.getenv("DJANGO_SETTINGS_MODULE", "bhmc.settings")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", settings_file)

application = get_wsgi_application()
