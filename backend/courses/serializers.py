from rest_framework import serializers

from .models import Course, Hole, Tee


class HoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hole
        fields = (
            "id",
            "course",
            "hole_number",
            "par",
        )


class TeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tee
        fields = (
            "id",
            "course",
            "name",
            "gg_id",
            "color",
        )


class CourseSerializer(serializers.ModelSerializer):
    holes = HoleSerializer(many=True, read_only=True)
    tees = TeeSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = (
            "id",
            "name",
            "number_of_holes",
            "gg_id",
            "color",
            "holes",
            "tees",
        )


class SimpleCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = (
            "id",
            "name",
            "number_of_holes",
            "color",
        )
