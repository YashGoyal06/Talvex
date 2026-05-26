from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from .models import InterviewSession
from .serializers import InterviewSessionSerializer
from django.utils import timezone

class InterviewSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = InterviewSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        company = self.request.company
        if not company:
            return InterviewSession.objects.none()
        return InterviewSession.objects.filter(company=company).order_by('-scheduled_at')

class InterviewSessionDetailView(views.APIView):
    # AllowAny for get so candidate can access details before joining
    permission_classes = [permissions.AllowAny]

    def get(self, request, room_id):
        try:
            session = InterviewSession.objects.get(room_id=room_id)
        except InterviewSession.DoesNotExist:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(InterviewSessionSerializer(session).data, status=status.HTTP_200_OK)

class UpdatePrivateNotesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        company = request.company
        session = InterviewSession.objects.filter(company=company, room_id=room_id).first()
        if not session:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        notes = request.data.get('notes', '')
        session.private_notes = notes
        session.save()

        return Response(InterviewSessionSerializer(session).data, status=status.HTTP_200_OK)

class SubmitFeedbackView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        company = request.company
        session = InterviewSession.objects.filter(company=company, room_id=room_id).first()
        if not session:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        feedback_data = request.data.get('feedback')
        if not feedback_data:
            return Response({"feedback": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        # Validate feedback structure
        required_fields = ["technical_skills", "communication", "problem_solving", "culture_fit", "recommendation"]
        for field in required_fields:
            if field not in feedback_data:
                return Response({"feedback": [f"Missing required scorecard field: '{field}'"]}, status=status.HTTP_400_BAD_REQUEST)

        session.feedback = feedback_data
        session.completed_at = timezone.now()
        session.save()

        # Update candidate application status
        from candidates.models import Application
        application = Application.objects.filter(job=session.job, candidate=session.candidate).first()
        if application:
            rec = feedback_data.get('recommendation')
            if rec in ('Strong Yes', 'Yes'):
                application.current_stage = "Offer"
                application.status = "Offered"
            elif rec in ('No', 'Strong No'):
                application.current_stage = "Rejected"
                application.status = "Rejected"
            application.save()

        return Response({
            "message": "Structured feedback submitted successfully.",
            "session": InterviewSessionSerializer(session).data
        }, status=status.HTTP_200_OK)

class CandidateMyInterviewsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        email = request.query_params.get('email')
        if not email:
            return Response({"detail": "email parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        sessions = InterviewSession.objects.filter(candidate__email=email).order_by('-scheduled_at')
        serializer = InterviewSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

