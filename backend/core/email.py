from urllib.parse import urlparse

from django.conf import settings as django_settings
from django.contrib.auth.tokens import default_token_generator
from djoser import utils
from djoser.conf import settings
from djoser.email import BaseEmailMessage


def _apply_website_url(context):
    """Set protocol and domain from WEBSITE_URL so email links match the frontend."""
    website_url = getattr(django_settings, "WEBSITE_URL", None)
    if website_url:
        parsed = urlparse(website_url)
        context["protocol"] = parsed.scheme
        context["domain"] = parsed.netloc


class ActivationEmail(BaseEmailMessage):
    template_name = "djoser/activation.html"

    def get_context_data(self):
        # ActivationEmail can be deleted
        context = super().get_context_data()

        user = context.get("user")
        context["uid"] = utils.encode_uid(user.pk)
        context["token"] = default_token_generator.make_token(user)
        context["url"] = settings.ACTIVATION_URL.format(**context)
        _apply_website_url(context)
        return context


class PasswordResetEmail(BaseEmailMessage):
    template_name = "djoser/password_reset.html"

    def get_context_data(self):
        # PasswordResetEmail can be deleted
        context = super().get_context_data()

        user = context.get("user")
        context["uid"] = utils.encode_uid(user.pk)
        context["token"] = default_token_generator.make_token(user)
        context["url"] = settings.PASSWORD_RESET_CONFIRM_URL.format(**context)
        _apply_website_url(context)
        return context
