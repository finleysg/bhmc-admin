from rest_framework import viewsets

from .models import Course, Hole, Tee
from .serializers import CourseSerializer, HoleSerializer, TeeSerializer


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer


class HoleViewSet(viewsets.ModelViewSet):
    queryset = Hole.objects.all()
    serializer_class = HoleSerializer


class TeeViewSet(viewsets.ModelViewSet):
    queryset = Tee.objects.all()
    serializer_class = TeeSerializer
