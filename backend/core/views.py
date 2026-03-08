import random
import string
from datetime import timedelta

import djoser.views
import structlog
from django.contrib.auth.models import User
from djoser import utils
from djoser.conf import settings
from faker import Faker
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from bhmc.settings import DJANGO_ENV, TEST_USER_PASSWORD
from core.util import current_season
from damcup.utils import get_point_rows, is_points
from documents.models import Document
from documents.utils import open_xls_workbook, open_xlsx_workbook
from events.models import Event
from register.models import Player
from scores.utils import get_course, get_score_type

from .models import Ace, BoardMember, LowScore, MajorChampion, SeasonSettings
from .serializers import (
    AceSerializer,
    BoardMemberSerializer,
    LowScoreSerializer,
    MajorChampionSerializer,
    SeasonSettingsSerializer,
)

is_localhost = DJANGO_ENV != "prod"
logger = structlog.get_logger(__name__)


class BoardMemberViewSet(viewsets.ModelViewSet):
    serializer_class = BoardMemberSerializer
    queryset = BoardMember.objects.all()


class MajorChampionViewSet(viewsets.ModelViewSet):
    serializer_class = MajorChampionSerializer

    def get_queryset(self):
        queryset = MajorChampion.objects.all()
        season = self.request.query_params.get("season", None)
        event_id = self.request.query_params.get("event", None)
        player_id = self.request.query_params.get("player", None)

        if season is not None:
            queryset = queryset.filter(season=season)
        if event_id is not None:
            queryset = queryset.filter(event=event_id)
        if player_id is not None:
            queryset = queryset.filter(player=player_id)
        queryset = queryset.order_by("event__start_date", "flight", "is_net")

        return queryset


class LowScoreViewSet(viewsets.ModelViewSet):
    serializer_class = LowScoreSerializer

    def get_queryset(self):
        queryset = LowScore.objects.all()
        season = self.request.query_params.get("season", None)

        if season is not None:
            queryset = queryset.filter(season=season)

        return queryset


class AceViewSet(viewsets.ModelViewSet):
    serializer_class = AceSerializer

    def get_queryset(self):
        queryset = Ace.objects.all()
        season = self.request.query_params.get("season", None)
        player_id = self.request.query_params.get("player_id", None)

        if season is not None:
            queryset = queryset.filter(season=season)
        if player_id is not None:
            queryset = queryset.filter(player=player_id)
            queryset = queryset.order_by("-season")

        return queryset


class SeasonSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = SeasonSettingsSerializer

    def get_queryset(self):
        queryset = SeasonSettings.objects.all()
        is_active = self.request.query_params.get("is_active", None)
        season = self.request.query_params.get("season", None)

        if season is not None:
            queryset = queryset.filter(season=season)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)

        return queryset.order_by("-season")


class TokenCreateView(djoser.views.TokenCreateView):
    def _action(self, serializer):
        token = utils.login_user(self.request, serializer.user)
        token_serializer_class = settings.SERIALIZERS.token

        response = Response()
        data = token_serializer_class(token).data

        response.set_cookie(
            key="access_token",
            path="/",
            value=data["auth_token"],
            max_age=timedelta(days=90),
            secure=not is_localhost,
            httponly=True,
            samesite="Lax",
            domain=".bhmc.org" if not is_localhost else None,
        )

        response.data = "Welcome!"
        response.status_code = status.HTTP_200_OK
        return response


class TokenDestroyView(djoser.views.TokenDestroyView):
    """Use this endpoint to logout user (remove user authentication token)."""

    permission_classes = settings.PERMISSIONS.token_destroy

    def post(self, request):
        response = Response()
        response.delete_cookie(
            key="access_token",
            path="/",
            samesite="Lax",
            domain=".bhmc.org" if not is_localhost else None,
        )
        response.status_code = status.HTTP_204_NO_CONTENT
        utils.logout_user(request)
        return response


@api_view(("POST",))
@permission_classes((permissions.IsAuthenticated,))
def import_champions(request):
    event_id = request.data.get("event_id", 0)
    document_id = request.data.get("document_id", 0)

    event = Event.objects.get(pk=event_id)
    season = event.season
    event_name = event.name

    players = Player.objects.filter(is_member=True).all()
    player_map = {player.player_name(): player for player in players}
    existing_champions = {
        champ.player.id: champ for champ in list(MajorChampion.objects.filter(event=event))
    }

    document = Document.objects.get(pk=document_id)
    wb = open_xlsx_workbook(document)
    sheet = wb.active
    last_row = sheet.max_row
    failures = []

    # skip header row
    for i in range(2, last_row + 1):
        flight = sheet.cell(row=i, column=1).value
        if flight is None:
            break

        champion = sheet.cell(row=i, column=2).value
        score = sheet.cell(row=i, column=3).value
        is_net = (
            False
            if sheet.cell(row=i, column=4).value is None
            else sheet.cell(row=i, column=4).value
        )

        try:
            players, errors = get_players(champion, player_map)
            team_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
            for player in players:
                existing = existing_champions.get(player.id)
                if existing is None:
                    new_champion = MajorChampion.objects.create(
                        season=season,
                        event=event,
                        event_name=event_name,
                        flight=flight,
                        player=player,
                        team_id=team_id,
                        score=score,
                        is_net=is_net,
                    )
                    new_champion.save()
                else:
                    existing.flight = flight
                    existing.score = score
                    existing.is_net = is_net
                    existing.team_id = team_id
                    existing.save()

            for error in errors:
                failures.append(error)

        except Exception as ex:
            failures.append(str(ex))

    # do not keep the data file
    document.file.delete()
    document.delete()

    return Response(data=failures, status=200)


@api_view(("POST",))
@permission_classes((permissions.IsAuthenticated,))
def import_low_scores(request):
    event_id = request.data.get("event_id", 0)
    document_id = request.data.get("document_id", 0)

    event = Event.objects.get(pk=event_id)
    document = Document.objects.get(pk=document_id)
    failures = []

    wb = open_xls_workbook(document)
    for sheet in wb.sheets():
        if is_points(sheet):
            score_type = get_score_type(sheet.name)
            course_name = get_course(sheet.name)
            low_score = 100

            for i in get_point_rows(sheet):
                if isinstance(sheet.cell(i, 3).value, (int, float)):
                    this_score = int(sheet.cell(i, 3).value)
                    if this_score < low_score:
                        low_score = this_score

            current_low_score = LowScore.objects.filter(
                season=event.season, course_name=course_name, is_net=score_type == "net"
            ).first()

            logger.info(f"Tonight's low {score_type} score on the {course_name}: {low_score}")
            if current_low_score is None:
                save_low_score(event, course_name, score_type, low_score, sheet, failures)
            else:
                if low_score < current_low_score.score:
                    LowScore.objects.filter(
                        season=event.season, course_name=course_name, is_net=score_type == "net"
                    ).delete()
                    save_low_score(event, course_name, score_type, low_score, sheet, failures)
                elif low_score == current_low_score.score:
                    save_low_score(event, course_name, score_type, low_score, sheet, failures)

    return Response(data=failures, status=200)


def save_low_score(event, course_name, score_type, score, sheet, failures):
    players = Player.objects.filter().all()
    player_map = {player.player_name(): player for player in players}
    for i in get_point_rows(sheet):
        if isinstance(sheet.cell(i, 3).value, (int, float)):
            this_score = int(sheet.cell(i, 3).value)
            if this_score == score:
                player_name = sheet.cell(i, 1).value
                player = player_map.get(player_name)

                if player is None:
                    message = f"player {player_name} not found when importing low scores"
                    failures.append(message)
                    continue

                try:
                    logger.info(
                        f"Saving low {score_type} score of {score} for {player_name} on the {course_name}"
                    )
                    low_score = LowScore.objects.create(
                        season=event.season,
                        course_name=course_name,
                        player=player,
                        score=score,
                        is_net=score_type == "net",
                    )
                    low_score.save()
                except Exception as ex:
                    failures.append(str(ex))


def get_players(champion, player_map):
    players = []
    errors = []
    partners = champion.split(" + ")
    for partner in partners:
        player = player_map.get(partner.strip())
        if player is None:
            errors.append(f"Player {partner} not found")
        else:
            players.append(player)

    return players, errors


fake = Faker()


def _generate_test_ghin():
    """Generate a unique GHIN like 999XXX (999 + 3 random digits)."""
    while True:
        ghin = f"999{random.randint(0, 999):03d}"
        if not Player.objects.filter(ghin=ghin).exists():
            return ghin


def _get_test_users(season):
    """Build 16 test user definitions with random names and predictable emails."""
    users = []
    # 12 members
    for i in range(1, 13):
        users.append(
            {
                "first_name": fake.first_name_male(),
                "last_name": fake.last_name(),
                "email": f"member-{i:02d}@test.bhmc.org",
                "is_member": True,
                "last_season": season,
            }
        )
    # 2 returning members (were members last season, not yet this season)
    for i in range(1, 3):
        users.append(
            {
                "first_name": fake.first_name_male(),
                "last_name": fake.last_name(),
                "email": f"returning-{i:02d}@test.bhmc.org",
                "is_member": False,
                "last_season": season - 1,
            }
        )
    # 2 non-members
    for i in range(1, 3):
        users.append(
            {
                "first_name": fake.first_name_male(),
                "last_name": fake.last_name(),
                "email": f"nonmember-{i:02d}@test.bhmc.org",
                "is_member": False,
                "last_season": None,
            }
        )
    return users


@api_view(("POST",))
@permission_classes((permissions.IsAdminUser,))
def create_test_users(request):
    if not is_localhost:
        return Response({"detail": "Not available in production."}, status=403)

    if not TEST_USER_PASSWORD:
        return Response({"detail": "TEST_USER_PASSWORD is not configured."}, status=500)

    season = current_season()
    created, existing = [], []

    for entry in _get_test_users(season):
        email = entry["email"]
        if Player.objects.filter(email=email).exists():
            player = Player.objects.get(email=email)
            updated = False
            if player.is_member != entry["is_member"]:
                player.is_member = entry["is_member"]
                updated = True
            if player.last_season != entry["last_season"]:
                player.last_season = entry["last_season"]
                updated = True
            if entry["is_member"] and not player.ghin:
                player.ghin = _generate_test_ghin()
                updated = True
            if updated:
                player.save()
            existing.append(
                {
                    "email": email,
                    "player_id": player.id,
                    "user_id": player.user_id,
                    "first_name": player.first_name,
                    "last_name": player.last_name,
                    "is_member": player.is_member,
                    "last_season": player.last_season,
                }
            )
            continue

        user = User.objects.create_user(
            username=email,
            email=email,
            password=TEST_USER_PASSWORD,
            first_name=entry["first_name"],
            last_name=entry["last_name"],
            is_active=True,
        )
        player = Player.objects.create(
            user=user,
            first_name=entry["first_name"],
            last_name=entry["last_name"],
            email=email,
            is_member=entry["is_member"],
            last_season=entry["last_season"],
            ghin=_generate_test_ghin() if entry["is_member"] else None,
        )
        created.append(
            {
                "email": email,
                "player_id": player.id,
                "user_id": user.id,
                "first_name": entry["first_name"],
                "last_name": entry["last_name"],
                "is_member": entry["is_member"],
                "last_season": entry["last_season"],
            }
        )

    return Response({"created": created, "existing": existing})
