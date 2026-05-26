from rest_framework import serializers
from .models import Candidate, Application
from jobs.models import Job
from .parser import parse_resume
import os

class CandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = '__all__'

class ApplicationSerializer(serializers.ModelSerializer):
    candidate = CandidateSerializer(read_only=True)
    job_title = serializers.CharField(source='job.title', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'job', 'job_title', 'company_name', 'candidate', 'current_stage', 
            'cover_letter', 'resume_file', 'internal_notes', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SubmitApplicationSerializer(serializers.Serializer):
    job_id = serializers.IntegerField()
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    resume = serializers.FileField()
    cover_letter = serializers.CharField(required=False, allow_blank=True)

    def validate_job_id(self, value):
        try:
            job = Job.objects.get(id=value, status="Active")
        except Job.DoesNotExist:
            raise serializers.ValidationError("Job posting not found or is closed.")
        return value

    def create(self, validated_data):
        job_id = validated_data['job_id']
        job = Job.objects.get(id=job_id)
        email = validated_data['email']
        name = validated_data['name']
        phone = validated_data.get('phone', '')
        cover_letter = validated_data.get('cover_letter', '')
        resume_file = validated_data['resume']

        # Get or create candidate
        name_parts = name.strip().split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        candidate, created = Candidate.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'phone': phone
            }
        )

        # Create application (this stores the resume file)
        application = Application.objects.create(
            company=job.company,
            job=job,
            candidate=candidate,
            cover_letter=cover_letter,
            resume_file=resume_file,
            current_stage="Applied",
            status="Active"
        )

        # Triggers parsing
        try:
            file_path = application.resume_file.path
            parsed_data, confidence = parse_resume(file_path)
            
            # Update candidate details with parsed info
            candidate.parsed_resume = parsed_data
            
            # Calculate job-specific ATS match score instead of using static parser confidence
            from .parser import calculate_ats_score
            ats_score = calculate_ats_score(parsed_data, job)
            candidate.confidence_score = ats_score
            
            if parsed_data.get('phone') and not candidate.phone:
                candidate.phone = parsed_data['phone']
            candidate.save()
        except Exception as e:
            # Keep application active even if parser errors out
            # Log the parser error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error executing resume parser during application submit: {e}")

        return application
