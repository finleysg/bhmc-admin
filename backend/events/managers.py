from django.db import models


class EventManager(models.Manager):
    def get_queryset(self):
        """
        Provide the base queryset with related `courses` and `fees` prefetched.

        Returns:
            QuerySet: A queryset of Event instances with the `courses` and `fees` relations prefetched to reduce database queries.
        """
        return super().get_queryset().prefetch_related("courses").prefetch_related("fees")


class EventFeeManager(models.Manager):
    def get_queryset(self):
        """
        Provide a queryset of EventFee objects with the related 'fee_type' loaded.

        Returns:
            QuerySet: EventFee queryset with the related `fee_type` included via `select_related`.
        """
        return super().get_queryset().select_related("fee_type")
