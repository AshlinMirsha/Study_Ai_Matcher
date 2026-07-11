from django.conf import settings
from django.test import SimpleTestCase

from ai_assistant.ai_provider import is_ai_configured


class AIConfigurationTests(SimpleTestCase):
    def test_local_database_is_configured_for_sqlite(self):
        self.assertEqual(settings.DATABASES['default']['ENGINE'], 'django.db.backends.sqlite3')

    def test_gemini_provider_is_configured(self):
        self.assertEqual(settings.AI_PROVIDER, 'gemini')
        self.assertTrue(settings.GEMINI_API_KEY)
        self.assertTrue(is_ai_configured())

