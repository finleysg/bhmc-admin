from django.contrib import admin

from courses.models import Course, Hole, Tee


class HoleInline(admin.TabularInline):
    model = Hole
    can_delete = True
    extra = 0
    fields = [
        "hole_number",
        "par",
    ]


class TeeInline(admin.TabularInline):
    model = Tee
    can_delete = True
    extra = 0
    fields = [
        "name",
        "gg_id",
        "color",
    ]


class CourseAdmin(admin.ModelAdmin):
    fields = [
        "name",
        "number_of_holes",
        "gg_id",
        "color",
    ]
    list_display = [
        "name",
        "number_of_holes",
        "gg_id",
        "color",
    ]
    save_on_top = True
    inlines = [
        HoleInline,
        TeeInline,
    ]


class TeeAdmin(admin.ModelAdmin):
    fields = [
        "course",
        "name",
        "gg_id",
        "color",
    ]
    list_display = [
        "course",
        "name",
        "gg_id",
        "color",
    ]
    list_filter = [
        "course",
    ]


admin.site.register(Course, CourseAdmin)
admin.site.register(Tee, TeeAdmin)
