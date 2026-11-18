class ReadOnlyAdminMixin:
    """
    Shows records without allowing changes. Records managed by the NestJS API
    (event setup in the event workspace, registration slots in the Registration
    Inspector) are changed on the admin site, which validates and audits every change.
    """

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
