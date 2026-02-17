import json
import re
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from courses.models import Course
from events.models import Event, EventFee, FeeType
from register.models import Player, Registration, RegistrationSlot


def make_slug(name):
    """Convert event name to URL slug: lowercase, strip [], replace spaces with hyphens."""
    slug = name.lower()
    slug = slug.replace("[", "").replace("]", "")
    slug = re.sub(r"[^a-z0-9 -]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug


TEMPLATES = {
    "weeknight": {
        "event_type": "N",
        "can_choose": True,
        "start_type": "TT",
        "course_ids": [1, 2, 3],
        "group_size": 5,
        "total_groups": 12,
        "minimum_signup_group_size": 3,
        "maximum_signup_group_size": 5,
        "signup_waves": 3,
        "skins_type": "I",
        "team_size": 1,
        "starter_time_interval": 9,
        "start_time": "4:00 PM",
        "tee_time_splits": "9",
        "fees": [
            {"fee_type_id": 5, "amount": 5, "is_required": True, "display_order": 0},
            {"fee_type_id": 6, "amount": 5, "is_required": False, "display_order": 1},
            {"fee_type_id": 7, "amount": 5, "is_required": False, "display_order": 2},
        ],
    },
    "major": {
        "event_type": "W",
        "can_choose": False,
        "start_type": "TT",
        "course_ids": [],
        "group_size": 4,
        "total_groups": None,
        "minimum_signup_group_size": 2,
        "maximum_signup_group_size": 4,
        "signup_waves": None,
        "skins_type": "T",
        "team_size": 2,
        "starter_time_interval": 0,
        "start_time": "Morning",
        "tee_time_splits": None,
        "fees": [
            {"fee_type_id": 5, "amount": 10, "is_required": True, "display_order": 0},
            {"fee_type_id": 6, "amount": 5, "is_required": False, "display_order": 1},
            {"fee_type_id": 7, "amount": 5, "is_required": False, "display_order": 2},
        ],
    },
}

TIME_VARIANTS = {
    "open": lambda now: {
        "priority_signup_start": None,
        "signup_start": now - timedelta(hours=1),
        "signup_end": now + timedelta(hours=24),
        "payments_end": now + timedelta(hours=48),
    },
    "priority": lambda now: {
        "priority_signup_start": now - timedelta(minutes=30),
        "signup_start": now + timedelta(minutes=30),
        "signup_end": now + timedelta(hours=24),
        "payments_end": now + timedelta(hours=48),
    },
    "closed": lambda now: {
        "priority_signup_start": None,
        "signup_start": now - timedelta(hours=48),
        "signup_end": now - timedelta(hours=24),
        "payments_end": now - timedelta(hours=12),
    },
}

EVENT_MATRIX = [
    ("weeknight", "open", "[E2E] Weeknight Open"),
    ("weeknight", "priority", "[E2E] Weeknight Priority"),
    ("weeknight", "closed", "[E2E] Weeknight Closed"),
    ("major", "open", "[E2E] Major Team Open"),
    ("major", "priority", "[E2E] Major Team Priority"),
    ("major", "closed", "[E2E] Major Team Closed"),
]

TEST_PLAYER_ID = 159


class Command(BaseCommand):
    help = "Seed (or clean) E2E test events prefixed with [E2E]"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean-only",
            action="store_true",
            help="Only delete existing [E2E] events without creating new ones",
        )

    def handle(self, *args, **options):
        self._clean()

        if options["clean_only"]:
            self.stderr.write(self.style.SUCCESS("Cleaned E2E test data"))
            return

        now = timezone.now()
        start_date = (now + timedelta(days=7)).date()
        events_output = {}

        for template_key, variant_key, name in EVENT_MATRIX:
            template = TEMPLATES[template_key]
            times = TIME_VARIANTS[variant_key](now)

            event = Event.objects.create(
                name=name,
                event_type=template["event_type"],
                season=2026,
                start_date=start_date,
                start_time=template["start_time"],
                status="S",
                registration_type="M",
                ghin_required=False,
                can_choose=template["can_choose"],
                start_type=template["start_type"],
                group_size=template["group_size"],
                total_groups=template["total_groups"],
                minimum_signup_group_size=template["minimum_signup_group_size"],
                maximum_signup_group_size=template["maximum_signup_group_size"],
                signup_waves=template["signup_waves"],
                skins_type=template["skins_type"],
                team_size=template["team_size"],
                starter_time_interval=template["starter_time_interval"],
                tee_time_splits=template["tee_time_splits"],
                priority_signup_start=times["priority_signup_start"],
                signup_start=times["signup_start"],
                signup_end=times["signup_end"],
                payments_end=times["payments_end"],
            )

            # Link courses
            if template["course_ids"]:
                courses = Course.objects.filter(id__in=template["course_ids"])
                event.courses.set(courses)

            # Create fees
            for fee_def in template["fees"]:
                fee_type = FeeType.objects.get(id=fee_def["fee_type_id"])
                EventFee.objects.create(
                    event=event,
                    fee_type=fee_type,
                    amount=fee_def["amount"],
                    is_required=fee_def["is_required"],
                    display_order=fee_def["display_order"],
                )

            # Create slots for choosable events
            if event.can_choose:
                RegistrationSlot.objects.create_slots_for_event(event)

            dict_key = f"{template_key}_{variant_key}"
            events_output[dict_key] = {
                "id": event.id,
                "name": event.name,
                "startDate": str(event.start_date),
                "slug": make_slug(event.name),
            }

        # Ensure test player is a current member
        Player.objects.filter(id=TEST_PLAYER_ID).update(is_member=True, last_season=2026)

        output = {
            "testPlayer": {"id": TEST_PLAYER_ID, "userId": 162},
            "events": events_output,
        }
        self.stdout.write(json.dumps(output))
        self.stderr.write(self.style.SUCCESS(f"Created {len(events_output)} E2E test events"))

    def _clean(self):
        """Delete all [E2E] events and clean up stale registrations for the test player."""
        from payments.models import Payment

        e2e_events = Event.objects.filter(name__startswith="[E2E]")
        e2e_event_ids = list(e2e_events.values_list("id", flat=True))

        # Delete payments first (FK to events prevents cascade)
        if e2e_event_ids:
            Payment.objects.filter(event_id__in=e2e_event_ids).delete()

        # Delete E2E events (cascades to slots, fees, registrations)
        deleted_count, _ = e2e_events.delete()

        # Clean up any stale registrations for the test player across all events
        stale_slots = RegistrationSlot.objects.filter(player_id=TEST_PLAYER_ID)
        registration_ids = set(
            stale_slots.filter(registration__isnull=False).values_list("registration_id", flat=True)
        )
        stale_slots.update(player=None, registration=None, status="A")
        if registration_ids:
            Registration.objects.filter(id__in=registration_ids).delete()

        if deleted_count:
            self.stderr.write(f"Deleted {deleted_count} E2E-related objects")
