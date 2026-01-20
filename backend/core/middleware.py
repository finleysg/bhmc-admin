from rest_framework.authtoken.models import Token


def auth_token(get_response):
    def middleware(request):
        token_key = request.COOKIES.get("access_token")
        if token_key and Token.objects.filter(key=token_key).exists():
            request.META["HTTP_AUTHORIZATION"] = f"Token {token_key}"

        return get_response(request)

    return middleware
