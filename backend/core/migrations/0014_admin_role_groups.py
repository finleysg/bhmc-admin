from django.db import migrations

# Admin roles enforced by the NestJS API (docs/adr/0003-admin-roles.md).
# Names must match ADMIN_ROLE_GROUPS in packages/domain.
ADMIN_ROLE_GROUPS = ["Event Admin", "Club Admin"]


def create_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for name in ADMIN_ROLE_GROUPS:
        Group.objects.get_or_create(name=name)


def delete_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name__in=ADMIN_ROLE_GROUPS).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("core", "0013_golfgeniusintegrationlog"),
    ]

    operations = [
        migrations.RunPython(create_groups, delete_groups),
    ]
