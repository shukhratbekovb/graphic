from django.urls import path
from pir import views as v
urlpatterns = [
    path('api/session', v.session), path('api/login', v.sign_in), path('api/logout', v.sign_out),
    path('api/bootstrap', v.bootstrap), path('api/schedules', v.schedules),
    path('api/schedules/<uuid:pk>', v.detail), path('api/schedules/<uuid:pk>/facts', v.facts),
    path('api/schedules/<uuid:pk>/history', v.history), path('api/schedules/<uuid:pk>/export', v.export),
    path('api/schedules/<uuid:pk>/import', v.import_tasks), path('api/schedules/<uuid:pk>/<str:command>', v.action),
    path('api/reports', v.report), path('api/reports/export', v.export), path('api/snapshots', v.snapshots),
    path('api/snapshots/<uuid:pk>/export', v.snapshot_export), path('api/calendars', v.calendars),
]
