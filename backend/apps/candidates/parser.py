import re
import os
import requests
import pdfplumber
import docx
import logging

logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"Error reading PDF {pdf_path}: {e}")
    return text

def extract_text_from_docx(docx_path):
    text = ""
    try:
        doc = docx.Document(docx_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        logger.error(f"Error reading DOCX {docx_path}: {e}")
    return text

def extract_text(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext in ('.docx', '.doc'):
        return extract_text_from_docx(file_path)
    elif ext in ('.txt', '.rtf'):
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading text file {file_path}: {e}")
    return ""

def parse_resume_heuristics(text):
    """
    Regex and heuristic fallback parser to run locally without external APIs.
    """
    parsed = {
        "name": "Unknown",
        "email": "",
        "phone": "",
        "skills": [],
        "experience_years": 0,
        "education": [],
        "work_history": []
    }

    if not text:
        return parsed

    # 1. Parse Email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        parsed["email"] = email_match.group(0)

    # 2. Parse Phone
    phone_match = re.search(r'(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}', text)
    if phone_match:
        parsed["phone"] = phone_match.group(0)

    # 3. Parse Name (usually on the first line)
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if lines:
        # Avoid lines that contain 'resume' or common email headers
        for line in lines[:3]:
            if '@' not in line and 'resume' not in line.lower() and len(line.split()) <= 4:
                parsed["name"] = line
                break

    # 4. Parse Skills (keyword check against a predefined taxonomy)
    common_skills = [
        "python", "django", "javascript", "typescript", "react", "vue", "angular", "node", "express",
        "html", "css", "tailwind", "bootstrap", "postgres", "sql", "mysql", "mongodb", "redis",
        "aws", "docker", "kubernetes", "git", "java", "c++", "c", "rust", "go", "ruby", "php"
    ]
    
    text_lower = text.lower()
    found_skills = []
    for skill in common_skills:
        # Match word boundaries to prevent matching 'go' inside 'google'
        if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            found_skills.append(skill.capitalize() if skill != 'css' and skill != 'html' else skill.upper())
    parsed["skills"] = found_skills

    # 5. Experience estimate
    exp_matches = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)\b', text_lower)
    if exp_matches:
        parsed["experience_years"] = max([int(x) for x in exp_matches])

    return parsed

def parse_resume_llm(text):
    """
    If a Gemini API or Claude API is available, use it for structured JSON parsing.
    Otherwise returns None.
    """
    # Check if Gemini/Claude API keys are present in environment
    # Let's write a standard fallback call or template.
    # In this plan, we provide a placeholder call to show how it's done.
    # If the user has a Gemini API key configured:
    api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        return None

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"
        prompt = (
            "You are an expert resume parsing engine. Parse the following resume text into a single JSON object. "
            "Return EXACTLY this JSON format and nothing else. Do not wrap in markdown tags:\n"
            "{\n"
            '  "name": "Candidate Name",\n'
            '  "email": "email@example.com",\n'
            '  "phone": "+1234567890",\n'
            '  "skills": ["JavaScript", "Python", ...],\n'
            '  "experience_years": 5,\n'
            '  "education": [{"degree": "B.S. Computer Science", "institution": "University Name", "year": 2020}],\n'
            '  "work_history": [{"company": "Google", "role": "Software Engineer", "duration": "2 years", "description": "built systems"}]\n'
            "}\n\n"
            f"Resume Text:\n{text}"
        )
        
        response = requests.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=10)
        if response.status_code == 200:
            res_json = response.json()
            content = res_json['candidates'][0]['content']['parts'][0]['text']
            # Clean JSON markdown fences
            content = content.replace("```json", "").replace("```", "").strip()
            import json
            return json.loads(content)
    except Exception as e:
        logger.error(f"Error parsing resume via Gemini: {e}")
    return None

def parse_resume_hf(text):
    """
    Use the Hugging Face Inference API to parse the resume text into structured JSON.
    """
    api_key = os.environ.get('HUGGINGFACE_API_KEY') or os.environ.get('HF_API_KEY')
    if not api_key:
        return None

    # Default to Llama-3-8B-Instruct if no model is specified
    model_id = os.environ.get('HF_MODEL_ID', 'meta-llama/Meta-Llama-3-8B-Instruct')
    url = f"https://api-inference.huggingface.co/models/{model_id}"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    prompt = (
        "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
        "You are an expert resume parsing engine. Parse the provided resume text into a single JSON object. "
        "Return ONLY valid JSON. Do not include markdown formatting, markdown code blocks (e.g. ```json), or any explanation text.<|eot_id|>"
        "<|start_header_id|>user<|end_header_id|>\n\n"
        "Format the parsed data exactly as follows:\n"
        "{\n"
        '  "name": "Candidate Name",\n'
        '  "email": "email@example.com",\n'
        '  "phone": "+1234567890",\n'
        '  "skills": ["Skill1", "Skill2"],\n'
        '  "experience_years": 5,\n'
        '  "education": [{"degree": "Degree Name", "institution": "Institution Name", "year": 2020}],\n'
        '  "work_history": [{"company": "Company Name", "role": "Role Name", "duration": "Duration", "description": "Description"}]\n'
        "}\n\n"
        f"Resume Text:\n{text}<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>\n\n"
    )
    
    try:
        response = requests.post(url, json={
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 1000,
                "return_full_text": False
            }
        }, headers=headers, timeout=15)
        
        if response.status_code == 200:
            res_json = response.json()
            if isinstance(res_json, list) and len(res_json) > 0:
                content = res_json[0].get('generated_text', '').strip()
            elif isinstance(res_json, dict):
                content = res_json.get('generated_text', '').strip()
            else:
                return None
                
            # Extract JSON from output in case the model wraps it in markdown or other text
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
                
            import json
            return json.loads(content)
        else:
            logger.warning(f"Hugging Face API returned status {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Error parsing resume via Hugging Face Inference API: {e}")
    return None

def parse_resume(file_path):
    raw_text = extract_text(file_path)
    if not raw_text:
        return {
            "name": "Unknown",
            "email": "",
            "phone": "",
            "skills": [],
            "experience_years": 0,
            "education": [],
            "work_history": [],
            "raw_text": ""
        }, 0.2

    # 1. Try Gemini LLM first
    parsed_json = parse_resume_llm(raw_text)
    if parsed_json:
        parsed_json["raw_text"] = raw_text
        return parsed_json, 0.95

    # 2. Try Hugging Face Inference API next
    parsed_json = parse_resume_hf(raw_text)
    if parsed_json:
        parsed_json["raw_text"] = raw_text
        return parsed_json, 0.95

    # 3. Fallback to local regex/heuristics
    parsed_json = parse_resume_heuristics(raw_text)
    parsed_json["raw_text"] = raw_text
    return parsed_json, 0.6

def calculate_ats_score(parsed_resume, job):
    """
    Calculate an ATS match score (between 0.0 and 1.0) based on:
    1. Skill overlap (parsed skills vs job requirements/description).
    2. Experience match (parsed experience vs experience requested in job description).
    3. Keyword overlap between job description/title and resume raw text.
    """
    if not parsed_resume:
        return 0.5

    # 1. Skill overlap
    parsed_skills = [s.lower().strip() for s in parsed_resume.get('skills', [])]
    job_reqs_text = " ".join(job.requirements).lower()
    job_desc_text = job.description.lower()
    job_title_text = job.title.lower()
    
    # Identify skills mentioned in requirements or description
    known_skills = [
        "python", "django", "javascript", "typescript", "react", "vue", "angular", "node", "express",
        "html", "css", "tailwind", "bootstrap", "postgres", "sql", "mysql", "mongodb", "redis",
        "aws", "docker", "kubernetes", "git", "java", "c++", "c", "rust", "go", "ruby", "php",
        "figma", "sketch", "photoshop", "illustrator", "wireframing", "prototyping", "ui", "ux",
        "tableau", "powerbi", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "machine learning",
        "statistics", "spark", "hadoop", "excel"
    ]
    
    job_skills = []
    for skill in known_skills:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, job_reqs_text) or re.search(pattern, job_desc_text) or re.search(pattern, job_title_text):
            job_skills.append(skill)
            
    skill_score = 1.0
    if job_skills:
        matched_skills = [s for s in parsed_skills if s in job_skills]
        skill_score = len(matched_skills) / len(job_skills)
        skill_score = min(max(skill_score, 0.2), 1.0)

    # 2. Experience match
    candidate_exp = parsed_resume.get('experience_years', 0)
    required_years = 0
    all_text = f"{job_reqs_text} {job_desc_text}"
    exp_matches = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)\b', all_text)
    if exp_matches:
        required_years = max([int(x) for x in exp_matches])
        
    exp_score = 1.0
    if required_years > 0:
        if candidate_exp >= required_years:
            exp_score = 1.0
        else:
            exp_score = candidate_exp / required_years
            exp_score = min(max(exp_score, 0.3), 1.0)

    # 3. Keyword / semantic overlap
    raw_text = parsed_resume.get('raw_text', '').lower()
    keyword_score = 0.5
    if raw_text:
        job_words = set(re.findall(r'\b[a-z]{3,15}\b', f"{job_title_text} {job_desc_text} {job_reqs_text}"))
        resume_words = set(re.findall(r'\b[a-z]{3,15}\b', raw_text))
        
        stopwords = {
            'and', 'the', 'for', 'with', 'you', 'will', 'our', 'are', 'that', 'this', 'from', 'have', 'has', 'been', 'their', 'they', 
            'our', 'your', 'about', 'some', 'any', 'but', 'not', 'can', 'should', 'would', 'could', 'their', 'them', 'these', 'those'
        }
        job_words -= stopwords
        resume_words -= stopwords
        
        if job_words:
            overlap = len(job_words.intersection(resume_words)) / len(job_words)
            keyword_score = min(max(overlap, 0.1), 1.0)

    # Weighted score: 50% Skills, 25% Experience, 25% Keyword overlap
    final_score = (skill_score * 0.50) + (exp_score * 0.25) + (keyword_score * 0.25)
    
    # Scale to typical ATS range (e.g. 50% to 98%)
    scaled_score = 0.5 + (final_score * 0.48)
    return round(min(max(scaled_score, 0.1), 0.99), 2)
