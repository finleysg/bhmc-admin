"""
Event setup moved to the NestJS event workspace (admin modernization slice 1).
Django keeps serving events but no longer changes them.
"""

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from events.models import Event, EventSession


class EventApiIsReadOnlyTestCase(TestCase):
    fixtures = ["fee_type", "event", "course", "hole"]

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser("admin", "admin@example.com", "pass")
        self.client.force_authenticate(self.admin)
        self.event = Event.objects.first()

    def test_lists_and_reads_events(self):
        self.assertEqual(self.client.get("/api/events/").status_code, status.HTTP_200_OK)
        response = self.client.get(f"/api/events/{self.event.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_refuses_create_update_and_delete_even_for_a_superuser(self):
        url = f"/api/events/{self.event.id}/"
        self.assertEqual(
            self.client.post("/api/events/", {"name": "New"}).status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertEqual(
            self.client.put(url, {"name": "Renamed"}).status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertEqual(
            self.client.patch(url, {"name": "Renamed"}).status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Event.objects.filter(pk=self.event.id, name=self.event.name).exists())

    def test_slot_and_copy_actions_are_gone(self):
        base = f"/api/events/{self.event.id}"
        for method, path in (
            ("post", "create_slots"),
            ("put", "append_teetime"),
            ("post", "copy_event"),
        ):
            response = getattr(self.client, method)(f"{base}/{path}/")
            self.assertIn(
                response.status_code,
                (status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED),
                path,
            )


class EventAdminIsReadOnlyTestCase(TestCase):
    fixtures = ["fee_type", "event", "course", "hole"]

    def setUp(self):
        self.admin = User.objects.create_superuser("admin", "admin@example.com", "pass")
        self.client.force_login(self.admin)
        self.event = Event.objects.first()

    def test_shows_an_event_without_letting_it_change(self):
        url = f"/admin/events/event/{self.event.id}/change/"

        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.post(url, {"name": "Renamed"}).status_code, 403)
        self.event.refresh_from_db()
        self.assertNotEqual(self.event.name, "Renamed")

    def test_offers_no_add_or_delete(self):
        self.assertEqual(self.client.get("/admin/events/event/add/").status_code, 403)
        delete = f"/admin/events/event/{self.event.id}/delete/"
        self.assertEqual(self.client.post(delete, {"post": "yes"}).status_code, 403)
        self.assertTrue(Event.objects.filter(pk=self.event.id).exists())

    def test_sessions_are_read_only(self):
        session = EventSession.objects.create(
            event=self.event, name="Early", registration_limit=40, display_order=1
        )
        url = f"/admin/events/eventsession/{session.id}/change/"

        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.post(url, {"name": "Late"}).status_code, 403)
        self.assertEqual(self.client.get("/admin/events/eventsession/add/").status_code, 403)
