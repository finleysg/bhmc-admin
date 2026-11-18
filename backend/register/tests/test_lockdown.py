"""
Registration slot repairs moved to the admin site's Registration Inspector
(admin modernization slice 4). Django admin shows slots but no longer changes them.
"""

from django.contrib.auth.models import User
from django.test import TestCase

from events.models import Event
from register.models import RegistrationSlot


class RegistrationSlotAdminIsReadOnlyTestCase(TestCase):
    fixtures = ["fee_type", "event", "course", "hole"]

    def setUp(self):
        self.admin = User.objects.create_superuser("admin", "admin@example.com", "pass")
        self.client.force_login(self.admin)
        self.slot = RegistrationSlot.objects.create(
            event=Event.objects.first(), status="A", starting_order=0, slot=0
        )

    def test_shows_a_slot_without_letting_it_change(self):
        url = f"/admin/register/registrationslot/{self.slot.id}/change/"

        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.post(url, {"status": "U"}).status_code, 403)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, "A")

    def test_offers_no_add_or_delete(self):
        self.assertEqual(self.client.get("/admin/register/registrationslot/add/").status_code, 403)
        delete = f"/admin/register/registrationslot/{self.slot.id}/delete/"
        self.assertEqual(self.client.post(delete, {"post": "yes"}).status_code, 403)
        self.assertTrue(RegistrationSlot.objects.filter(pk=self.slot.id).exists())
