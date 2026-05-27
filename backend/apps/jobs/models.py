from django.db import models
from companies.models import TenantModel
from django.utils import timezone

class Job(TenantModel):
    title = models.CharField(max_length=255)
    department = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    type = models.CharField(max_length=50, default="Full-time") # Full-time, Part-time, Contract, Internship
    priority = models.CharField(max_length=50, default="Normal") # Normal, Urgent, Low
    status = models.CharField(max_length=50, default="Active") # Active, Closed, Draft
    description = models.TextField()
    requirements = models.JSONField(default=list, blank=True) # list of requirements
    application_form_schema = models.JSONField(default=dict, blank=True) # fields schema
    pipeline_stages = models.JSONField(default=list, blank=True) # custom pipeline stages
    created_at = models.DateTimeField(default=timezone.now)
    deadline = models.DateField(null=True, blank=True)

    @property
    def days_open(self):
        return (timezone.now() - self.created_at).days

    @property
    def is_expired(self):
        return self.deadline is not None and self.deadline < timezone.localdate()

    def __str__(self):
        return f"{self.title} - {self.company.name}"
