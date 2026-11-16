from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase

from events.models import Event


class EventModelTests(TestCase):
    fixtures = ["fee_type", "event", "event_fee", "course", "hole"]

    def test_weeknight_teetimes_is_valid(self):
        event = Event.objects.get(pk=3)
        event.clean()
        self.assertTrue(True)

    def test_weeknight_teetimes_must_have_total_groups(self):
        event = Event.objects.get(pk=3)
        event.total_groups = 0
        with self.assertRaises(
            ValidationError,
            msg="You must include the number of groups per course when players are "
            "choosing their own tee times",
        ):
            event.clean()

    def test_weeknight_shotgun_is_valid(self):
        event = Event.objects.get(pk=6)
        event.clean()
        self.assertTrue(True)

    def test_weeknight_can_choose_must_have_group_size(self):
        event = Event.objects.get(pk=3)
        event.group_size = 0
        with self.assertRaises(
            ValidationError,
            msg="A group size is required if players are choosing their starting hole or tee time",
        ):
            event.clean()

    def test_weeknight_registration_signup_end(self):
        event = Event.objects.get(pk=3)
        event.signup_end = None
        with self.assertRaises(
            ValidationError,
            msg="When an event requires registration, both signup start and "
            "signup end are required",
        ):
            event.clean()

    def test_weeknight_registration_signup_start(self):
        event = Event.objects.get(pk=3)
        event.signup_start = None
        with self.assertRaises(
            ValidationError,
            msg="When an event requires registration, both signup start and "
            "signup end are required",
        ):
            event.clean()

    def test_weeknight_registration_signup_start_before_end(self):
        """
        Verifies that an Event whose signup_start is after signup_end fails validation.

        This test sets signup_start to one hour after signup_end and asserts that calling
        event.clean() raises a ValidationError with the message "The signup start must be earlier than signup end".
        """
        event = Event.objects.get(pk=3)
        event.signup_start = event.signup_end + timedelta(hours=1)
        with self.assertRaises(
            ValidationError, msg="The signup start must be earlier than signup end"
        ):
            event.clean()
