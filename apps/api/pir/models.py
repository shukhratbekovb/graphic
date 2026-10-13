import uuid
from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=24, choices=[(x, x) for x in ['gip', 'coordinator', 'technical', 'finance', 'director', 'department']])
    department = models.CharField(max_length=100, blank=True)


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    title = models.CharField(max_length=250)
    gip = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)


class NetworkTemplate(models.Model):
    code = models.CharField(max_length=32, unique=True)
    title = models.CharField(max_length=250)
    data = models.JSONField(default=dict)
    is_demo = models.BooleanField(default=True)


class Calendar(models.Model):
    title = models.CharField(max_length=150)
    data = models.JSONField(default=dict)
    is_demo = models.BooleanField(default=True)


class Schedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name='schedules')
    number = models.CharField(max_length=100, unique=True)
    stage = models.CharField(max_length=40, default='РД')
    phase = models.CharField(max_length=100, default='01')
    title = models.CharField(max_length=250)
    created_at = models.DateTimeField(auto_now_add=True)


class Revision(models.Model):
    schedule = models.ForeignKey(Schedule, on_delete=models.PROTECT, related_name='revisions')
    number = models.PositiveIntegerField()
    data = models.JSONField(default=dict)
    status = models.CharField(max_length=20, default='draft')
    edit_version = models.PositiveIntegerField(default=1)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='authored_revisions')
    approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name='review_revisions')
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True)
    approved_at = models.DateTimeField(null=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['schedule', 'number'], name='revision_number_unique')]
        ordering = ['number']


class Fact(models.Model):
    schedule = models.ForeignKey(Schedule, on_delete=models.PROTECT, related_name='facts')
    node_id = models.CharField(max_length=80)
    effective_date = models.DateField()
    recorded_at = models.DateTimeField(auto_now_add=True)
    actual_start = models.DateField(null=True)
    actual_end = models.DateField(null=True)
    progress = models.DecimalField(max_digits=5, decimal_places=2)
    reason = models.TextField(blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    class Meta:
        indexes = [models.Index(fields=['schedule', 'node_id', 'effective_date', 'recorded_at'])]
        constraints = [models.CheckConstraint(condition=models.Q(progress__gte=0, progress__lte=100), name='fact_progress_range')]


class Audit(models.Model):
    schedule = models.ForeignKey(Schedule, on_delete=models.PROTECT, related_name='audit', null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=100)
    detail = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-created_at']


class ReportSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    title = models.CharField(max_length=150)
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
