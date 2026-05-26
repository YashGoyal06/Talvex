from django.urls import path
from .views import InterviewSessionListCreateView, InterviewSessionDetailView, UpdatePrivateNotesView, SubmitFeedbackView, CandidateMyInterviewsView

urlpatterns = [
    path('', InterviewSessionListCreateView.as_view(), name='interview_list_create'),
    path('my-interviews/', CandidateMyInterviewsView.as_view(), name='my_interviews'),
    path('<str:room_id>/', InterviewSessionDetailView.as_view(), name='interview_detail'),
    path('<str:room_id>/notes/', UpdatePrivateNotesView.as_view(), name='interview_notes'),
    path('<str:room_id>/feedback/', SubmitFeedbackView.as_view(), name='interview_feedback'),
]

