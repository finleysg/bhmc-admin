from django.conf import settings
from django.db import models
from django.db.models import CASCADE, DO_NOTHING

from events.models import Event
from register.models import Player


class BoardMember(models.Model):
    player = models.ForeignKey(verbose_name="Player", to=Player, on_delete=DO_NOTHING)
    role = models.CharField(verbose_name="Role", max_length=40)
    term_expires = models.IntegerField(verbose_name="Member thru")

    def __str__(self):
        return f"{self.player.first_name} {self.player.last_name} ({self.role})"


class MajorChampion(models.Model):
    season = models.IntegerField(verbose_name="Season")
    event = models.ForeignKey(
        verbose_name="Event", to=Event, null=True, blank=True, on_delete=DO_NOTHING
    )
    event_name = models.CharField(verbose_name="Event name", max_length=60)
    flight = models.CharField(verbose_name="Flight", max_length=30)
    player = models.ForeignKey(verbose_name="Player", to=Player, on_delete=DO_NOTHING)
    score = models.IntegerField(verbose_name="Score", default=0)
    is_net = models.BooleanField(verbose_name="Is net score", default=False)
    team_id = models.CharField(verbose_name="Team Id", max_length=8, null=True, blank=True)

    def __str__(self):
        return f"{self.season} {self.event_name} - {self.player.last_name}"


class LowScore(models.Model):
    season = models.IntegerField(verbose_name="Season")
    course_name = models.CharField(verbose_name="Course", max_length=40)
    player = models.ForeignKey(verbose_name="Player", to=Player, on_delete=DO_NOTHING)
    score = models.IntegerField(verbose_name="Score", default=0)
    is_net = models.BooleanField(verbose_name="Is net score", default=False)

    def __str__(self):
        return f"{self.season} {self.course_name} - {self.player.last_name}"


class Ace(models.Model):
    season = models.IntegerField(verbose_name="Season")
    hole_name = models.CharField(verbose_name="Hole", max_length=30)
    player = models.ForeignKey(verbose_name="Player", to=Player, on_delete=DO_NOTHING)
    shot_date = models.DateField(verbose_name="Date", null=True)

    def __str__(self):
        return f"{self.season} {self.hole_name} - {self.player.last_name}"


class SeasonSettings(models.Model):
    season = models.IntegerField(verbose_name="Season")
    is_active = models.BooleanField(verbose_name="Is Active", default=False)
    member_event = models.ForeignKey(
        verbose_name="Membership Event", to=Event, related_name="member_event", on_delete=DO_NOTHING
    )
    match_play_event = models.ForeignKey(
        verbose_name="Match Play Event",
        to=Event,
        related_name="match_play_event",
        on_delete=DO_NOTHING,
    )

    def __str__(self):
        """
        Provide a human-readable label for the season indicating whether it is active.

        Returns:
            label (str): The season followed by "Active" if is_active is True, otherwise "Inactive".
        """
        return "{} ({})".format(self.season, "Active" if self.is_active else "Inactive")


class GolfGeniusIntegrationLog(models.Model):
    event = models.ForeignKey(
        verbose_name="Event", to=Event, related_name="integration_logs", on_delete=DO_NOTHING
    )
    action_name = models.CharField(verbose_name="Action Name", max_length=20)
    action_date = models.DateTimeField(verbose_name="Date", auto_now_add=True)
    is_successful = models.BooleanField(verbose_name="Action Completed Successfully")
    details = models.TextField(verbose_name="Serialized Details", null=True, blank=True)

    def __str__(self):
        """
        Return a human-readable representation of the integration log.

        Returns:
            str: A string in the format "Event {event_id} ({action_name} - {action_date})".
        """
        return f"Event {self.event.id} ({self.action_name} - {self.action_date})"


class AdminAuditEntry(models.Model):
    """
    One administrative change, written by the NestJS API in the same transaction as the
    change itself. `changes` holds {field: {"before": ..., "after": ...}} for changed
    fields only. Entries are never updated or deleted.
    """

    CLIENT_CHOICES = (("ui", "Admin UI"), ("cli", "CLI"))

    created_at = models.DateTimeField(verbose_name="When", auto_now_add=True)
    actor = models.ForeignKey(verbose_name="Who", to=settings.AUTH_USER_MODEL, on_delete=DO_NOTHING)
    client = models.CharField(verbose_name="Client", max_length=3, choices=CLIENT_CHOICES)
    operation = models.CharField(verbose_name="Operation", max_length=60)
    entity_type = models.CharField(verbose_name="Entity type", max_length=30)
    entity_id = models.IntegerField(verbose_name="Entity id")
    event = models.ForeignKey(
        verbose_name="Event", to=Event, null=True, blank=True, on_delete=DO_NOTHING
    )
    changes = models.JSONField(verbose_name="Changes")

    class Meta:
        indexes = [
            models.Index(fields=["entity_type", "entity_id"], name="audit_entity_idx"),
            models.Index(fields=["created_at"], name="audit_created_idx"),
        ]

    def __str__(self):
        return f"{self.created_at} {self.operation} {self.entity_type}:{self.entity_id}"


class AdminSetting(models.Model):
    """
    An operational setting edited in the admin (alert lead times, thresholds, recipients).
    Keys, types, and defaults are defined in the NestJS API; a key with no row uses its default.
    """

    key = models.CharField(verbose_name="Key", max_length=60, unique=True)
    value = models.JSONField(verbose_name="Value")
    updated_by = models.ForeignKey(
        verbose_name="Updated by", to=settings.AUTH_USER_MODEL, on_delete=DO_NOTHING
    )
    updated_at = models.DateTimeField(verbose_name="Updated at")

    def __str__(self):
        return self.key


class ReadinessDismissal(models.Model):
    """
    A readiness warning an Event Admin has accepted for one event, written by the NestJS API.
    `code` names the check and `subject` what it is about within the event (for example a fee
    type id), or "" when the check has one finding per event. Blocking findings are never
    dismissed.
    """

    event = models.ForeignKey(verbose_name="Event", to=Event, on_delete=CASCADE)
    code = models.CharField(verbose_name="Check", max_length=40)
    subject = models.CharField(verbose_name="Subject", max_length=60, blank=True, default="")
    dismissed_by = models.ForeignKey(
        verbose_name="Dismissed by", to=settings.AUTH_USER_MODEL, on_delete=DO_NOTHING
    )
    dismissed_at = models.DateTimeField(verbose_name="Dismissed at")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "code", "subject"], name="readiness_dismissal_unique"
            )
        ]

    def __str__(self):
        return f"{self.event_id} {self.code} {self.subject}"
