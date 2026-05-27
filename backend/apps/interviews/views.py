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
        
        queryset = InterviewSession.objects.filter(company=company)
        
        # Filter by creator/recruiter if user is a recruiter and not a company admin
        from companies.models import RecruiterProfile, CompanyAdminProfile
        is_admin = CompanyAdminProfile.objects.filter(user=self.request.user).exists()
        is_recruiter = RecruiterProfile.objects.filter(user=self.request.user).exists()
        if is_recruiter and not is_admin:
            queryset = queryset.filter(job__created_by=self.request.user)
            
        return queryset.order_by('-scheduled_at')

class InterviewSessionDetailView(views.APIView):
    # AllowAny for get and patch so candidate and recruiter can access details / reschedule
    permission_classes = [permissions.AllowAny]

    def get(self, request, room_id):
        try:
            session = InterviewSession.objects.get(room_id=room_id)
        except InterviewSession.DoesNotExist:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(InterviewSessionSerializer(session).data, status=status.HTTP_200_OK)

    def patch(self, request, room_id):
        try:
            session = InterviewSession.objects.get(room_id=room_id)
        except InterviewSession.DoesNotExist:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        scheduled_at = request.data.get('scheduled_at')
        if not scheduled_at:
            return Response({"scheduled_at": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session.scheduled_at = scheduled_at
            session.save()
            return Response(InterviewSessionSerializer(session).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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


import base64
import requests
import json
import uuid
import os
import time
import logging
import re
import random
from django.conf import settings
from rest_framework.parsers import MultiPartParser, FormParser
from assessments.models import CodingQuestion
import jwt
import pdfplumber

logger = logging.getLogger(__name__)

DEFAULT_CODING_QUESTIONS = [
    {
        "id": 1,
        "title": "Two Sum",
        "difficulty": "Easy",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] == 9, so we return [0, 1].",
        "starter_code": {
            "javascript": "function solution(nums, target) {\n  // Write your code here\n  return [];\n}",
            "python": "def solution(nums, target):\n    # Write your code here\n    return []"
        },
        "test_cases": [
            {"input": "[2,7,11,15], 9", "expected_output": "[0, 1]", "is_hidden": False}
        ]
    },
    {
        "id": 2,
        "title": "Reverse Integer",
        "difficulty": "Medium",
        "description": "Given a signed 32-bit integer x, return x with its digits reversed. If reversing x causes the value to go outside the signed 32-bit integer range [-2^31, 2^31 - 1], then return 0.\n\nExample 1:\nInput: x = 123\nOutput: 321",
        "starter_code": {
            "javascript": "function solution(x) {\n  // Write your code here\n  return 0;\n}",
            "python": "def solution(x):\n    # Write your code here\n    return 0"
        },
        "test_cases": [
            {"input": "123", "expected_output": "321", "is_hidden": False}
        ]
    }
]

def upload_pdf_to_supabase(uploaded_file, bucket_name='interview-questions'):
    ext = os.path.splitext(uploaded_file.name)[1]
    file_name = f"{uuid.uuid4()}{ext}"
    try:
        jwt_secret = settings.SUPABASE_JWT_SECRET
        decoded_secret = jwt_secret.encode('utf-8') if isinstance(jwt_secret, str) else jwt_secret

        payload = {
            "role": "service_role",
            "iss": "supabase",
            "iat": int(time.time()),
            "exp": int(time.time() + 3600)
        }
        token = jwt.encode(payload, decoded_secret, algorithm="HS256")
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        bucket_check_url = f"{settings.SUPABASE_URL}/storage/v1/bucket/{bucket_name}"
        check_res = requests.get(bucket_check_url, headers=headers)
        
        if check_res.status_code != 200:
            create_bucket_url = f"{settings.SUPABASE_URL}/storage/v1/bucket"
            body = {"id": bucket_name, "name": bucket_name, "public": True}
            requests.post(create_bucket_url, headers=headers, json=body)
            
        upload_headers = {
            "Authorization": f"Bearer {token}",
        }
        upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket_name}/{file_name}"
        
        file_data = uploaded_file.read()
        content_type = "application/pdf"
        upload_headers["Content-Type"] = content_type
        
        res = requests.post(upload_url, headers=upload_headers, data=file_data)
        if res.status_code == 200:
            public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{file_name}"
            return public_url
    except Exception as e:
        logger.error(f"Failed to upload PDF to Supabase: {e}")
    return None

def extract_pdf_via_gemini_multimodal(file_bytes, model_name="gemini-1.5-flash"):
    api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        logger.warning("No GEMINI_API_KEY or GOOGLE_API_KEY found.")
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    base64_data = base64.b64encode(file_bytes).decode('utf-8')

    prompt = (
        "You are an expert technical interviewer. Parse the provided coding interview question PDF "
        "(which may be typed or handwritten) and extract ALL coding questions into a single valid JSON array. "
        "Each question object MUST strictly have the following fields:\n"
        "- title: The name of the coding problem.\n"
        "- difficulty: Either 'Easy', 'Medium', or 'Hard'.\n"
        "- description: Clear and detailed description of the problem statement, parameters, and input/output rules.\n"
        "- starter_code: A JSON object with language starter templates, e.g. {\"javascript\": \"function solution() {\\n\\n}\", \"python\": \"def solution():\\n    pass\"}.\n"
        "- test_cases: A JSON list of test case objects. E.g. [{\"input\": \"5\", \"expected_output\": \"10\", \"is_hidden\": false}].\n"
        "\nReturn ONLY the JSON array inside a raw text. Do not wrap in markdown or markdown code blocks like ```json."
    )

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inlineData": {
                        "mimeType": "application/pdf",
                        "data": base64_data
                    }
                }
            ]
        }]
    }

    try:
        response = requests.post(url, json=payload, timeout=20)
        if response.status_code == 200:
            res_json = response.json()
            content = res_json['candidates'][0]['content']['parts'][0]['text']
            content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        else:
            logger.error(f"Gemini {model_name} failed with status {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Error in Gemini multimodal parse: {e}")
    return None

def parse_pdf_via_huggingface(raw_text):
    api_key = os.environ.get('HUGGINGFACE_API_KEY') or os.environ.get('HF_API_KEY')
    if not api_key:
        return None

    model_id = os.environ.get('HF_MODEL_ID', 'Qwen/Qwen2.5-7B-Instruct')
    url = f"https://api-inference.huggingface.co/models/{model_id}"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    prompt = (
        f"Parse the following text from an interview questions document and extract the coding questions into a valid JSON array of question objects. "
        "Each question must contain: 'title', 'difficulty' ('Easy'/'Medium'/'Hard'), 'description', "
        "'starter_code' (object with 'javascript' and 'python'), and 'test_cases' (list of objects with 'input', 'expected_output', 'is_hidden'). "
        "Return ONLY valid JSON.\n\n"
        f"Document Text:\n{raw_text}"
    )

    try:
        response = requests.post(url, json={"inputs": prompt, "parameters": {"max_new_tokens": 1000}}, headers=headers, timeout=12)
        if response.status_code == 200:
            res_data = response.json()
            content = ""
            if isinstance(res_data, list) and len(res_data) > 0:
                content = res_data[0].get('generated_text', '').strip()
            elif isinstance(res_data, dict):
                content = res_data.get('generated_text', '').strip()
            
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
    except Exception as e:
        logger.error(f"Hugging Face PDF parsing fallback failed: {e}")
    return None

def parse_pdf_heuristics(raw_text):
    questions = []
    if not raw_text:
        raw_text = "Standard Coding Challenge"
    
    parts = re.split(r'(?:Question|Problem|Task)\s*\d*\s*[:\-]\s*', raw_text, flags=re.IGNORECASE)
    
    if len(parts) > 1:
        for i, part in enumerate(parts[1:]):
            lines = [l.strip() for l in part.split('\n') if l.strip()]
            title = lines[0] if lines else f"Coding Challenge {i+1}"
            desc = "\n".join(lines[1:]) if len(lines) > 1 else part
            questions.append({
                "title": title[:100],
                "difficulty": "Medium",
                "description": desc,
                "starter_code": {
                    "javascript": "function solution() {\n  // Write your code here\n}",
                    "python": "def solution():\n    pass"
                },
                "test_cases": [{"input": "1", "expected_output": "1", "is_hidden": False}]
            })
    
    if not questions:
        questions.append({
            "title": "Algorithm Challenge",
            "difficulty": "Medium",
            "description": raw_text[:2000],
            "starter_code": {
                "javascript": "function solution() {\n  // Write your code here\n}",
                "python": "def solution():\n    pass"
            },
            "test_cases": [{"input": "1", "expected_output": "1", "is_hidden": False}]
        })
    return questions

class InterviewQuestionsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, room_id):
        try:
            session = InterviewSession.objects.get(room_id=room_id)
        except InterviewSession.DoesNotExist:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        if not session.questions:
            questions_qs = CodingQuestion.objects.filter(company__isnull=True)
            if questions_qs.exists():
                session.questions = CodingQuestionSerializer(questions_qs, many=True).data
            else:
                session.questions = DEFAULT_CODING_QUESTIONS
            session.save()

        return Response(session.questions, status=status.HTTP_200_OK)

    def post(self, request, room_id):
        try:
            session = InterviewSession.objects.get(room_id=room_id)
        except InterviewSession.DoesNotExist:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        questions = request.data.get('questions')
        if not isinstance(questions, list):
            return Response({"detail": "questions field must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        session.questions = questions
        session.save()
        return Response(session.questions, status=status.HTTP_200_OK)

class InterviewImportPdfView(views.APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, room_id):
        try:
            session = InterviewSession.objects.get(room_id=room_id)
        except InterviewSession.DoesNotExist:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({"error": "No PDF file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        file_bytes = uploaded_file.read()
        uploaded_file.seek(0)
        pdf_url = upload_pdf_to_supabase(uploaded_file)

        parsed_questions = None

        # Level 1: Gemini 1.5 Flash
        try:
            logger.info("Attempting PDF multimodal parse via Gemini 1.5 Flash...")
            parsed_questions = extract_pdf_via_gemini_multimodal(file_bytes, model_name="gemini-1.5-flash")
        except Exception as e:
            logger.error(f"Gemini 1.5 Flash failed: {e}")

        # Level 2: Gemini 1.5 Pro
        if not parsed_questions:
            try:
                logger.info("Attempting PDF multimodal parse via Gemini 1.5 Pro (Fallback)...")
                parsed_questions = extract_pdf_via_gemini_multimodal(file_bytes, model_name="gemini-1.5-pro")
            except Exception as e:
                logger.error(f"Gemini 1.5 Pro failed: {e}")

        # Level 3: Hugging Face Qwen-2.5
        if not parsed_questions:
            try:
                logger.info("Attempting plain text PDF parse via Hugging Face...")
                raw_text = ""
                with pdfplumber.open(uploaded_file) as pdf:
                    for page in pdf.pages:
                        t = page.extract_text()
                        if t:
                            raw_text += t + "\n"
                parsed_questions = parse_pdf_via_huggingface(raw_text)
            except Exception as e:
                logger.error(f"Hugging Face plain text PDF parse failed: {e}")

        # Level 4: Heuristics
        if not parsed_questions:
            logger.warning("All LLM PDF parsers failed. Falling back to local heuristic segmenter.")
            try:
                uploaded_file.seek(0)
                raw_text = ""
                with pdfplumber.open(uploaded_file) as pdf:
                    for page in pdf.pages:
                        t = page.extract_text()
                        if t:
                            raw_text += t + "\n"
                parsed_questions = parse_pdf_heuristics(raw_text)
            except Exception as e:
                logger.error(f"Local heuristic PDF segmenter failed: {e}")
                parsed_questions = DEFAULT_CODING_QUESTIONS

        sanitized_questions = []
        for idx, q in enumerate(parsed_questions):
            sanitized_questions.append({
                "id": idx + 1,
                "title": q.get('title', f"Parsed Question {idx+1}"),
                "difficulty": q.get('difficulty', 'Medium'),
                "description": q.get('description', 'Solve the problem.'),
                "starter_code": q.get('starter_code', {
                    "javascript": "function solution() {\n  // Write your code here\n}",
                    "python": "def solution():\n    pass"
                }),
                "test_cases": q.get('test_cases', [
                    {"input": "1", "expected_output": "1", "is_hidden": False}
                ])
            })

        session.questions = sanitized_questions
        session.save()

        return Response({
            "message": "PDF parsed successfully.",
            "questions": session.questions,
            "parsed_url": pdf_url
        }, status=status.HTTP_200_OK)

class InterviewImportCodeforcesView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, room_id):
        try:
            session = InterviewSession.objects.get(room_id=room_id)
        except InterviewSession.DoesNotExist:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        count = request.data.get('count', 5)
        try:
            count = int(count)
        except ValueError:
            count = 5

        cf_url = "https://codeforces.com/api/problemset.problems"
        try:
            res = requests.get(cf_url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get('status') == 'OK':
                    problems = data.get('result', {}).get('problems', [])
                    valid_problems = [
                        p for p in problems 
                        if p.get('rating') and 800 <= p.get('rating') <= 1500
                    ]
                    
                    if not valid_problems:
                        valid_problems = problems

                    sample_size = min(count, len(valid_problems))
                    selected_cf = random.sample(valid_problems, sample_size)

                    imported_questions = []
                    for idx, p in enumerate(selected_cf):
                        contest_id = p.get('contestId')
                        index = p.get('index')
                        name = p.get('name')
                        rating = p.get('rating', 1000)
                        
                        difficulty = 'Easy' if rating <= 1100 else 'Medium'
                        prob_link = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
                        tags = ", ".join(p.get('tags', []))
                        
                        desc = (
                            f"Codeforces Problem {contest_id}{index} - {name}\n"
                            f"Link: {prob_link}\n"
                            f"Difficulty Rating: {rating}\n"
                            f"Tags: {tags}\n\n"
                            f"Please click the link above to view the problem constraints, input/output requirements, and example test cases.\n"
                            f"Write a solution program that processes input correctly."
                        )

                        imported_questions.append({
                            "id": idx + 1,
                            "title": f"Codeforces: {name}",
                            "difficulty": difficulty,
                            "description": desc,
                            "starter_code": {
                                "javascript": f"// Codeforces problem: {prob_link}\nfunction solution(input) {{\n  // Process input lines here\n}}",
                                "python": f"# Codeforces problem: {prob_link}\ndef solution(input):\n    # Process input lines here\n    pass"
                            },
                            "test_cases": [
                                {"input": "1", "expected_output": "1", "is_hidden": False}
                            ]
                        })

                    session.questions = imported_questions
                    session.save()
                    return Response(session.questions, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Codeforces import failed: {e}")

        return Response({"detail": "Failed to fetch from Codeforces API. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


