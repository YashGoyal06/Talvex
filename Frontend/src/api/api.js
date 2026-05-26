const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const role = localStorage.getItem('userRole');
  return (token && token !== 'undefined' && token !== 'null' && role !== 'candidate') 
    ? { 'Authorization': `Bearer ${token}` } 
    : {};
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Set auth headers if token is present and not explicitly skipped
  const headers = {
    ...options.headers,
    ...(options.skipAuth ? {} : getAuthHeaders()),
  };

  // If body is not FormData, set Content-Type to JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: 'Network response was not ok' };
    }

    // Auto logout if the backend returns User not found (e.g. database re-seeded)
    if (response.status === 401 && (errorData.code === 'user_not_found' || errorData.detail === 'User not found' || errorData.detail === 'Token is invalid or expired')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      window.location.href = '/login?role=recruiter';
    }

    const err = new Error(errorData.detail || errorData.message || JSON.stringify(errorData));
    err.status = response.status;
    err.data = errorData;
    throw err;
  }

  return response.json();
}

export const api = {
  // WS URL helper
  getWebSocketUrl(roomId) {
    return `${WS_BASE_URL}/interview/${roomId}/`;
  },

  // Auth APIs
  auth: {
    async recruiterLogin(email, token) {
      return request('/auth/recruiter-login/', {
        method: 'POST',
        body: { email, token },
        skipAuth: true
      });
    },

    async recruiterProfileSetup(profileData) {
      return request('/auth/recruiter-profile-setup/', {
        method: 'POST',
        body: profileData,
        skipAuth: true
      });
    },

    // Simulate Candidate Login locally
    async candidateLogin(email, password) {
      let name = 'Candidate';
      try {
        const apps = await request(`/candidates/my-applications/?email=${encodeURIComponent(email)}`, { skipAuth: true });
        if (apps && apps.length > 0 && apps[0].candidate) {
          name = `${apps[0].candidate.first_name} ${apps[0].candidate.last_name}`;
        } else {
          const prefix = email.split('@')[0];
          name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        }
      } catch (err) {
        const prefix = email.split('@')[0];
        name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }

      const header = { alg: "HS256", typ: "JWT" };
      const payload = { sub: `candidate_${email}`, email: email, role: 'candidate' };
      const mockToken = btoa(JSON.stringify(header)) + "." + btoa(JSON.stringify(payload)) + ".c2lnbmF0dXJl";
      return {
        access: mockToken,
        refresh: mockToken,
        user: { email, full_name: name, role: 'candidate' }
      };
    },
    
    // Simulate Company Admin Supabase Login locally
    async adminLogin(email, password) {
      // In a real Supabase setup, you use supabase.auth.signInWithPassword()
      // Since Django verifies Supabase JWTs, we mock obtaining a JWT for local convenience if JWT_SECRET is default
      // Or we can just call our own endpoint or store token.
      // To bypass Supabase backend in mock, we generate a mock JWT on frontend that backend allows in debug mode!
      const header = { alg: "HS256", typ: "JWT" };
      const payload = { sub: "admin_demo_uuid_123", email: email, user_metadata: { full_name: "Rohan Mehta" } };
      const mockToken = btoa(JSON.stringify(header)) + "." + btoa(JSON.stringify(payload)) + ".c2lnbmF0dXJl";
      localStorage.setItem('accessToken', mockToken);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', 'Rohan Mehta');
      localStorage.setItem('userRole', 'admin');
      return { user: { email, full_name: 'Rohan Mehta', role: 'admin' }, token: mockToken };
    },

    async getTestCredentials() {
      return request('/auth/test-credentials/', { skipAuth: true });
    },

    async uploadFile(file, bucket = 'avatars') {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      return request('/auth/upload-file/', {
        method: 'POST',
        body: formData,
        skipAuth: true
      });
    },

    async updateProfile(profileData) {
      return request('/auth/update-profile/', {
        method: 'PATCH',
        body: profileData
      });
    }
  },

  // Team Management (Company Admin)
  team: {
    async listRecruiters() {
      return request('/companies/recruiters/');
    },

    async inviteRecruiter(email) {
      return request('/companies/recruiters/', {
        method: 'POST',
        body: { email }
      });
    },

    async revokeRecruiter(id) {
      return request(`/companies/recruiters/${id}/revoke/`, {
        method: 'POST'
      });
    },

    async regenerateToken(email) {
      return request('/companies/recruiters/regenerate-token/', {
        method: 'POST',
        body: { email }
      });
    }
  },

  // Requisitions / Jobs API
  jobs: {
    async list() {
      return request('/jobs/');
    },

    async get(id) {
      return request(`/jobs/${id}/`);
    },

    async create(jobData) {
      return request('/jobs/', {
        method: 'POST',
        body: jobData
      });
    },

    async delete(id) {
      return request(`/jobs/${id}/`, {
        method: 'DELETE'
      });
    },

    async getPublic(id) {
      return request(`/jobs/public/${id}/`);
    }
  },

  // Candidates / Pipeline API
  candidates: {
    async list(filters = {}) {
      const params = new URLSearchParams();
      if (filters.job_id) params.append('job_id', filters.job_id);
      if (filters.stage) params.append('stage', filters.stage);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/candidates/${query}`);
    },

    async get(id) {
      return request(`/candidates/${id}/`);
    },

    async updateStage(id, stage) {
      return request(`/candidates/${id}/stage/`, {
        method: 'PATCH',
        body: { stage }
      });
    },

    async addNote(id, note) {
      return request(`/candidates/${id}/notes/`, {
        method: 'POST',
        body: { note }
      });
    },

    async apply(formData) {
      // formData must be instance of FormData (contains name, email, phone, job_id, resume, cover_letter)
      return request('/candidates/public/apply/', {
        method: 'POST',
        body: formData
      });
    },

    async myApplications(email) {
      return request(`/candidates/my-applications/?email=${encodeURIComponent(email)}`);
    },

    async getProfile(email) {
      return request(`/candidates/profile/?email=${encodeURIComponent(email)}`);
    },

    async updateProfile(email, profileData) {
      return request('/candidates/profile/', {
        method: 'PATCH',
        body: { email, ...profileData },
        skipAuth: true
      });
    }
  },


  // Assessments API
  assessments: {
    async assign(candidateId, jobId, questionIds = [], durationMinutes = 60) {
      return request('/assessments/assign/', {
        method: 'POST',
        body: {
          candidate_id: candidateId,
          job_id: jobId,
          question_ids: questionIds,
          duration_minutes: durationMinutes
        }
      });
    },

    async getSession(token) {
      return request(`/assessments/session/${token}/`);
    },

    async runCode(token, questionId, code, language, stdin = '', expectedOutput = '') {
      return request(`/assessments/session/${token}/run/`, {
        method: 'POST',
        body: {
          question_id: questionId,
          code,
          language,
          stdin,
          expected_output: expectedOutput
        }
      });
    },

    async submitSolution(token, questionId, code, language) {
      return request(`/assessments/session/${token}/submit/`, {
        method: 'POST',
        body: {
          question_id: questionId,
          code,
          language
        }
      });
    },

    async finish(token) {
      return request(`/assessments/session/${token}/finish/`, {
        method: 'POST'
      });
    },

    async listQuestions() {
      return request('/assessments/questions/');
    }
  },

  // Live Interview Room API
  interviews: {
    async list() {
      return request('/interviews/');
    },

    async myInterviews(email) {
      return request(`/interviews/my-interviews/?email=${encodeURIComponent(email)}`);
    },

    async schedule(candidateId, jobId, scheduledAt) {
      return request('/interviews/', {
        method: 'POST',
        body: {
          candidate_id: candidateId,
          job_id: jobId,
          scheduled_at: scheduledAt
        }
      });
    },


    async getDetail(roomId) {
      return request(`/interviews/${roomId}/`);
    },

    async updateNotes(roomId, notes) {
      return request(`/interviews/${roomId}/notes/`, {
        method: 'POST',
        body: { notes }
      });
    },

    async submitFeedback(roomId, feedbackData) {
      return request(`/interviews/${roomId}/feedback/`, {
        method: 'POST',
        body: { feedback: feedbackData }
      });
    }
  }
};
