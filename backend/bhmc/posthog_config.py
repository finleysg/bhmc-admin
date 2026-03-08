import os

_posthog_client = None


def get_posthog_client():
    global _posthog_client
    if _posthog_client is None:
        key = os.getenv("POSTHOG_KEY")
        if key:
            from posthog import Posthog

            _posthog_client = Posthog(
                key,
                host=os.getenv("POSTHOG_HOST", "https://us.i.posthog.com"),
            )
    return _posthog_client


def capture_exception(exc):
    client = get_posthog_client()
    if client:
        client.capture_exception(exc, properties={"app": "backend"})
