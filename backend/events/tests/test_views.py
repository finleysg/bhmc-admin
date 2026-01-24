from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from events.models import Event, Round, Tournament, TournamentPoints, TournamentResult
from register.models import Player


class TournamentResultViewSetTestCase(TestCase):
    fixtures = ["fee_type", "event", "course", "hole"]

    def setUp(self):
        self.client = APIClient()

        # Create player
        self.user = User.objects.create_user(
            username="testplayer", email="test@example.com", password="testpass"
        )
        self.player = Player.objects.create(
            first_name="Test",
            last_name="Player",
            email="test@example.com",
            birth_date="1990-01-01",
            ghin="1234567",
        )

        # Create second player
        self.user2 = User.objects.create_user(
            username="testplayer2", email="test2@example.com", password="testpass"
        )
        self.player2 = Player.objects.create(
            first_name="Test2",
            last_name="Player2",
            email="test2@example.com",
            birth_date="1991-01-01",
            ghin="7654321",
        )

        # Get events from fixtures with different seasons
        self.event_2024 = Event.objects.get(pk=1)
        self.event_2024.season = 2024
        self.event_2024.save()

        self.event_2023 = Event.objects.get(pk=2)
        self.event_2023.season = 2023
        self.event_2023.save()

        # Create rounds
        self.round_2024 = Round.objects.create(
            event=self.event_2024,
            round_number=1,
            round_date=self.event_2024.start_date,
            gg_id="round2024",
        )

        self.round_2023 = Round.objects.create(
            event=self.event_2023,
            round_number=1,
            round_date=self.event_2023.start_date,
            gg_id="round2023",
        )

        # Create tournaments
        self.tournament_2024 = Tournament.objects.create(
            event=self.event_2024,
            round=self.round_2024,
            name="Test Tournament 2024",
            format="Stroke",
            is_net=False,
            gg_id="tournament2024",
        )

        self.tournament_2023 = Tournament.objects.create(
            event=self.event_2023,
            round=self.round_2023,
            name="Test Tournament 2023",
            format="Stroke",
            is_net=False,
            gg_id="tournament2023",
        )

        # Create tournament results
        self.result1 = TournamentResult.objects.create(
            tournament=self.tournament_2024,
            player=self.player,
            position=1,
            score=72,
            amount=100.00,
            payout_type="Cash",
            payout_to="Individual",
            payout_status="Pending",
        )

        self.result2 = TournamentResult.objects.create(
            tournament=self.tournament_2023,
            player=self.player,
            position=2,
            score=75,
            amount=50.00,
            payout_type="Cash",
            payout_to="Individual",
            payout_status="Pending",
        )

        self.result3 = TournamentResult.objects.create(
            tournament=self.tournament_2024,
            player=self.player2,
            position=3,
            score=76,
            amount=25.00,
            payout_type="Cash",
            payout_to="Individual",
            payout_status="Pending",
        )

    def test_filter_by_player(self):
        """GET /api/tournament-results/?player=123 returns only that player's results"""
        response = self.client.get(f"/api/tournament-results/?player={self.player.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        for result in response.data:
            self.assertEqual(result["player"], self.player.id)

    def test_filter_by_season(self):
        """GET /api/tournament-results/?season=2024 returns only 2024 results"""
        response = self.client.get("/api/tournament-results/?season=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_filter_by_player_and_season(self):
        """Combined filters work: ?player=123&season=2024"""
        response = self.client.get(f"/api/tournament-results/?player={self.player.id}&season=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["player"], self.player.id)
        self.assertEqual(response.data[0]["position"], 1)

    def test_no_filters_returns_all(self):
        """No params returns all (backward compatible)"""
        response = self.client.get("/api/tournament-results/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)


class TournamentPointsViewSetTestCase(TestCase):
    fixtures = ["fee_type", "event", "course", "hole"]

    def setUp(self):
        self.client = APIClient()

        # Create player
        self.user = User.objects.create_user(
            username="testplayer", email="test@example.com", password="testpass"
        )
        self.player = Player.objects.create(
            first_name="Test",
            last_name="Player",
            email="test@example.com",
            birth_date="1990-01-01",
            ghin="1234567",
        )

        # Create second player
        self.user2 = User.objects.create_user(
            username="testplayer2", email="test2@example.com", password="testpass"
        )
        self.player2 = Player.objects.create(
            first_name="Test2",
            last_name="Player2",
            email="test2@example.com",
            birth_date="1991-01-01",
            ghin="7654321",
        )

        # Get events from fixtures with different seasons
        self.event_2024 = Event.objects.get(pk=1)
        self.event_2024.season = 2024
        self.event_2024.save()

        self.event_2023 = Event.objects.get(pk=2)
        self.event_2023.season = 2023
        self.event_2023.save()

        # Create rounds
        self.round_2024 = Round.objects.create(
            event=self.event_2024,
            round_number=1,
            round_date=self.event_2024.start_date,
            gg_id="round2024",
        )

        self.round_2023 = Round.objects.create(
            event=self.event_2023,
            round_number=1,
            round_date=self.event_2023.start_date,
            gg_id="round2023",
        )

        # Create tournaments
        self.tournament_2024 = Tournament.objects.create(
            event=self.event_2024,
            round=self.round_2024,
            name="Test Tournament 2024",
            format="Stroke",
            is_net=False,
            gg_id="tournament2024",
        )

        self.tournament_2023 = Tournament.objects.create(
            event=self.event_2023,
            round=self.round_2023,
            name="Test Tournament 2023",
            format="Stroke",
            is_net=False,
            gg_id="tournament2023",
        )

        # Create tournament points
        self.points1 = TournamentPoints.objects.create(
            tournament=self.tournament_2024,
            player=self.player,
            position=1,
            score=72,
            points=10,
        )

        self.points2 = TournamentPoints.objects.create(
            tournament=self.tournament_2023,
            player=self.player,
            position=2,
            score=75,
            points=8,
        )

        self.points3 = TournamentPoints.objects.create(
            tournament=self.tournament_2024,
            player=self.player2,
            position=3,
            score=76,
            points=6,
        )

    def test_get_all_points(self):
        """GET /api/tournament-points/ returns all points"""
        response = self.client.get("/api/tournament-points/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_filter_by_player(self):
        """GET /api/tournament-points/?player=123 returns only that player's points"""
        response = self.client.get(f"/api/tournament-points/?player={self.player.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        for point in response.data:
            self.assertEqual(point["player"], self.player.id)

    def test_filter_by_season(self):
        """GET /api/tournament-points/?season=2024 returns only 2024 points"""
        response = self.client.get("/api/tournament-points/?season=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_filter_by_player_and_season(self):
        """GET /api/tournament-points/?player=123&season=2024 returns filtered"""
        response = self.client.get(f"/api/tournament-points/?player={self.player.id}&season=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["player"], self.player.id)
        self.assertEqual(response.data[0]["position"], 1)
