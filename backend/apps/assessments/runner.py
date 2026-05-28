import requests
import json
import base64
import os
import subprocess
import tempfile
import logging

logger = logging.getLogger(__name__)

# Map standard names to Judge0 Language IDs
JUDGE0_LANGUAGE_MAP = {
    'python': 71,      # Python (3.8.1)
    'javascript': 63,  # JavaScript (Node.js 12.14.0)
    'typescript': 74,  # TypeScript (3.7.4)
    'java': 62,        # Java (OpenJDK 13.0.1)
    'c++': 54,         # C++ (GCC 9.2.0)
    'go': 60,          # Go (1.13.5)
    'rust': 73,        # Rust (1.40.0)
}

def execute_code_via_judge0(code, language, stdin="", expected_output=""):
    api_url = os.environ.get('JUDGE0_API_URL', 'https://judge0-ce.p.rapidapi.com')
    api_key = os.environ.get('JUDGE0_API_KEY', '')

    lang_id = JUDGE0_LANGUAGE_MAP.get(language.lower(), 71)

    headers = {
        "content-type": "application/json",
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
    }

    payload = {
        "source_code": base64.b64encode(code.encode('utf-8')).decode('utf-8'),
        "language_id": lang_id,
        "stdin": base64.b64encode(stdin.encode('utf-8')).decode('utf-8') if stdin else "",
        "expected_output": base64.b64encode(expected_output.encode('utf-8')).decode('utf-8') if expected_output else ""
    }

    try:
        # Create submission
        submit_url = f"{api_url}/submissions?base64_encoded=true&wait=true"
        response = requests.post(submit_url, json=payload, headers=headers, timeout=10)
        
        if response.status_code in (200, 201):
            res_data = response.json()
            status_desc = res_data.get('status', {}).get('description', 'Unknown')
            stdout_b64 = res_data.get('stdout', '')
            stderr_b64 = res_data.get('stderr', '')
            compile_err_b64 = res_data.get('compile_output', '')

            stdout = base64.b64decode(stdout_b64).decode('utf-8') if stdout_b64 else ""
            stderr = base64.b64decode(stderr_b64).decode('utf-8') if stderr_b64 else ""
            compile_err = base64.b64decode(compile_err_b64).decode('utf-8') if compile_err_b64 else ""

            return {
                "success": status_desc == "Accepted",
                "status": status_desc,
                "stdout": stdout,
                "stderr": stderr or compile_err,
                "time": res_data.get('time'),
                "memory": res_data.get('memory')
            }
    except Exception as e:
        logger.error(f"Error executing via Judge0: {e}")
        
    return None

def execute_code_locally(code, language, stdin="", expected_output=""):
    """
    Local subprocess execution. Supports: Python, JavaScript, C++, Go, Java, TypeScript, Rust.
    """
    lang = language.lower()

    def clean_str(s):
        return s.strip().replace('\r\n', '\n')

    should_compare_output = bool(str(expected_output).strip())

    def build_result(stdout, stderr, returncode, timeout_val=0.1):
        success = returncode == 0 if not should_compare_output else clean_str(stdout) == clean_str(expected_output)
        if returncode != 0:
            return {
                "success": False,
                "status": "Runtime Error",
                "stdout": stdout,
                "stderr": stderr,
                "time": timeout_val,
                "memory": 1000
            }
        status_desc = "Executed" if not should_compare_output else ("Accepted" if success else "Wrong Answer")
        return {
            "success": success,
            "status": status_desc,
            "stdout": stdout,
            "stderr": stderr,
            "time": timeout_val,
            "memory": 1000
        }

    # ─── Interpreted languages (no compile step) ───────────────────────

    if lang == 'python':
        return _run_interpreted(code, '.py', ['python3'], stdin, build_result)

    elif lang == 'javascript':
        return _run_interpreted(code, '.js', ['node'], stdin, build_result,
                                not_found_msg="Node.js not found. Install Node.js to run JavaScript locally.")

    elif lang == 'typescript':
        return _run_interpreted(code, '.ts', ['npx', 'ts-node'], stdin, build_result,
                                not_found_msg="ts-node not found. Install TypeScript (npm i -g ts-node typescript) to run TypeScript locally.",
                                timeout=10)

    # ─── Compiled languages (compile + run) ────────────────────────────

    elif lang == 'c++':
        return _run_compiled(
            code, src_ext='.cpp',
            compile_cmd=lambda src, exe: ['g++', '-o', exe, src, '-std=c++17'],
            stdin=stdin, build_result=build_result,
            not_found_msg="g++ compiler not found. Install GCC to run C++ locally."
        )

    elif lang == 'java':
        return _run_java(code, stdin, build_result)

    elif lang == 'go':
        return _run_interpreted(code, '.go', ['go', 'run'], stdin, build_result,
                                not_found_msg="Go not found. Install Go to run Go code locally.",
                                timeout=10)

    elif lang == 'rust':
        return _run_compiled(
            code, src_ext='.rs',
            compile_cmd=lambda src, exe: ['rustc', '-o', exe, src],
            stdin=stdin, build_result=build_result,
            not_found_msg="rustc compiler not found. Install Rust to run Rust code locally."
        )

    # Unsupported language
    return {
        "success": False,
        "status": "Runtime Error",
        "stdout": "",
        "stderr": f"Local execution not supported for language: {language}.",
        "time": 0.0,
        "memory": 0
    }


def _run_interpreted(code, ext, cmd_prefix, stdin, build_result, not_found_msg=None, timeout=5):
    """Run an interpreted language: write to temp file, execute directly."""
    temp_file = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
            f.write(code.encode('utf-8'))
            temp_file = f.name

        proc = subprocess.run(
            cmd_prefix + [temp_file],
            input=stdin, text=True, capture_output=True, timeout=timeout
        )
        return build_result(proc.stdout, proc.stderr, proc.returncode)

    except subprocess.TimeoutExpired:
        return {
            "success": False, "status": "Time Limit Exceeded",
            "stdout": "", "stderr": "Execution timed out.",
            "time": float(timeout), "memory": 1000
        }
    except FileNotFoundError:
        return {
            "success": False, "status": "Runtime Error",
            "stdout": "", "stderr": not_found_msg or f"Interpreter for {ext} not found.",
            "time": 0.0, "memory": 0
        }
    except Exception as e:
        return {
            "success": False, "status": "Runtime Error",
            "stdout": "", "stderr": str(e),
            "time": 0.0, "memory": 0
        }
    finally:
        if temp_file and os.path.exists(temp_file):
            os.remove(temp_file)


def _run_compiled(code, src_ext, compile_cmd, stdin, build_result, not_found_msg=None, compile_timeout=15, run_timeout=5):
    """Compile source to binary, then execute the binary."""
    src_file = None
    exe_file = None
    try:
        with tempfile.NamedTemporaryFile(suffix=src_ext, delete=False) as f:
            f.write(code.encode('utf-8'))
            src_file = f.name
        exe_file = src_file.replace(src_ext, '')

        # Compile
        compile_proc = subprocess.run(
            compile_cmd(src_file, exe_file),
            text=True, capture_output=True, timeout=compile_timeout
        )
        if compile_proc.returncode != 0:
            return {
                "success": False, "status": "Compilation Error",
                "stdout": "", "stderr": compile_proc.stderr,
                "time": 0.0, "memory": 0
            }

        # Run
        run_proc = subprocess.run(
            [exe_file],
            input=stdin, text=True, capture_output=True, timeout=run_timeout
        )
        return build_result(run_proc.stdout, run_proc.stderr, run_proc.returncode)

    except subprocess.TimeoutExpired:
        return {
            "success": False, "status": "Time Limit Exceeded",
            "stdout": "", "stderr": "Execution timed out.",
            "time": float(run_timeout), "memory": 1000
        }
    except FileNotFoundError:
        return {
            "success": False, "status": "Runtime Error",
            "stdout": "", "stderr": not_found_msg or f"Compiler for {src_ext} not found.",
            "time": 0.0, "memory": 0
        }
    except Exception as e:
        return {
            "success": False, "status": "Runtime Error",
            "stdout": "", "stderr": str(e),
            "time": 0.0, "memory": 0
        }
    finally:
        if src_file and os.path.exists(src_file):
            os.remove(src_file)
        if exe_file and os.path.exists(exe_file):
            os.remove(exe_file)


def _run_java(code, stdin, build_result, timeout=10):
    """Java needs special handling: class name must match filename."""
    import re
    tmp_dir = None
    try:
        tmp_dir = tempfile.mkdtemp()

        # Extract public class name, default to Main
        match = re.search(r'public\s+class\s+(\w+)', code)
        class_name = match.group(1) if match else 'Main'

        src_file = os.path.join(tmp_dir, f'{class_name}.java')
        with open(src_file, 'w') as f:
            f.write(code)

        # Compile
        compile_proc = subprocess.run(
            ['javac', src_file],
            text=True, capture_output=True, timeout=15
        )
        if compile_proc.returncode != 0:
            return {
                "success": False, "status": "Compilation Error",
                "stdout": "", "stderr": compile_proc.stderr,
                "time": 0.0, "memory": 0
            }

        # Run
        run_proc = subprocess.run(
            ['java', '-cp', tmp_dir, class_name],
            input=stdin, text=True, capture_output=True, timeout=timeout
        )
        return build_result(run_proc.stdout, run_proc.stderr, run_proc.returncode)

    except subprocess.TimeoutExpired:
        return {
            "success": False, "status": "Time Limit Exceeded",
            "stdout": "", "stderr": "Execution timed out.",
            "time": float(timeout), "memory": 1000
        }
    except FileNotFoundError:
        return {
            "success": False, "status": "Runtime Error",
            "stdout": "", "stderr": "Java (javac/java) not found. Install JDK to run Java locally.",
            "time": 0.0, "memory": 0
        }
    except Exception as e:
        return {
            "success": False, "status": "Runtime Error",
            "stdout": "", "stderr": str(e),
            "time": 0.0, "memory": 0
        }
    finally:
        if tmp_dir and os.path.exists(tmp_dir):
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)

def execute_code_via_piston(code, language, stdin="", expected_output=""):
    """
    Execute code via Piston API - a free, public code execution engine that does not require keys.
    """
    url = "https://emkc.org/api/v2/piston/execute"
    lang = language.lower()
    
    piston_lang_map = {
        'python': 'python',
        'javascript': 'javascript',
        'typescript': 'typescript',
        'java': 'java',
        'c++': 'cpp',
        'go': 'go',
        'rust': 'rust',
    }
    
    piston_lang = piston_lang_map.get(lang, lang)
    
    payload = {
        "language": piston_lang,
        "version": "*",
        "files": [
            {
                "content": code
            }
        ],
        "stdin": stdin
    }
    
    try:
        response = requests.post(url, json=payload, timeout=8)
        if response.status_code == 200:
            res_data = response.json()
            run_result = res_data.get('run', {})
            stdout = run_result.get('stdout', '')
            stderr = run_result.get('stderr', '')
            
            def clean_str(s):
                return s.strip().replace('\r\n', '\n')
                
            should_compare_output = bool(str(expected_output).strip())
            success = not stderr if not should_compare_output else clean_str(stdout) == clean_str(expected_output)
            
            status_desc = "Executed" if not should_compare_output else "Accepted"
            if stderr:
                status_desc = "Runtime Error"
            elif not success:
                status_desc = "Wrong Answer"
                
            return {
                "success": success,
                "status": status_desc,
                "stdout": stdout,
                "stderr": stderr,
                "time": 0.1,
                "memory": 1000
            }
    except Exception as e:
        logger.error(f"Error executing via Piston: {e}")
        
    return None

def run_code(code, language, stdin="", expected_output=""):
    api_key = os.environ.get('JUDGE0_API_KEY', '')
    if api_key and api_key != 'placeholder-key':
        res = execute_code_via_judge0(code, language, stdin, expected_output)
        if res:
            return res
            
    # Try free Piston cloud execution engine first (no key needed)
    res = execute_code_via_piston(code, language, stdin, expected_output)
    if res:
        return res
        
    # Fallback to local subprocess execution
    return execute_code_locally(code, language, stdin, expected_output)
