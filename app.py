# Flask Python Backend for Online Interview Analyzer
import os
import json
import re
from flask import Flask, request, jsonify, render_template, send_from_directory
import google.generativeai as genai

app = Flask(__name__, template_folder='templates', static_folder='static')

DB_PATH = os.path.join('data', 'db.json')

# Helper to ensure database file exists
def init_db():
    if not os.path.exists('data'):
        os.makedirs('data')
    if not os.path.exists(DB_PATH):
        # Initial seed demo data
        demo_sessions = [
            {
                "id": "session_demo_1",
                "date": "2026-06-08T10:30:00Z",
                "role": "frontend",
                "roleLabel": "Frontend Engineer",
                "level": "Mid",
                "type": "Technical",
                "score": 84,
                "categories": {
                    "technical": 88,
                    "clarity": 82,
                    "delivery": 80,
                    "confidence": 86
                },
                "duration": 382,
                "answers": [
                    {
                        "question": "Explain the difference between client-side rendering (CSR) and server-side rendering (SSR). When would you choose one over the other?",
                        "transcript": "So, client side rendering is when the browser downloads a minimal HTML wrapper and a big JavaScript file, then renders everything on the client side using a library like React. Server side rendering, on the other hand, means the server renders the full HTML on each request, sends it to the browser, and then hydration takes place. I would choose client side rendering for interactive dashboards where SEO doesn't matter, and server side rendering for e-commerce or public blogs where SEO and fast first paint is critical.",
                        "analysis": {
                            "score": 92,
                            "feedback": "Excellent explanation. You accurately highlighted key differences including initial page loads, SEO implications, and the hydration process. Mentioning 'first paint' and specific use-cases (e-commerce vs dashboard) showed strong architectural understanding.",
                            "keywordsMatched": ["SEO", "first paint", "hydration", "performance", "Next.js"]
                        }
                    },
                    {
                        "question": "What is the event loop in JavaScript and how does it handle asynchronous operations?",
                        "transcript": "JavaScript is single-threaded, meaning it can only execute one thing at a time. The event loop is a mechanism that monitors the call stack and the callback queue. When the call stack is empty, it pushes events or callbacks from the queue to the stack to be executed. Async operations like setTimeout are handled by Web APIs which queue tasks when finished.",
                        "analysis": {
                            "score": 85,
                            "feedback": "Very good breakdown of the single-threaded nature of JS, the call stack, and the callback queue. You could have further refined your answer by distinguishing between the microtask queue (for Promises) and the macrotask queue (for timeouts).",
                            "keywordsMatched": ["call stack", "callback queue", "single-threaded", "promises", "non-blocking"]
                        }
                    }
                ]
            }
        ]
        with open(DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(demo_sessions, f, indent=4)

init_db()

# Python-based Local Heuristics Fallback Analyzer
def analyze_locally(role_label, question, transcript, expected_keywords):
    clean_transcript = transcript.lower()
    
    # 1. Keyword Overlap
    keywords_matched = []
    for kw in expected_keywords:
        if kw.lower() in clean_transcript:
            keywords_matched.append(kw)

    keyword_ratio = len(keywords_matched) / len(expected_keywords) if expected_keywords else 0.5

    # 2. Technical Score (Length + Keywords)
    length = len(clean_transcript.strip())
    technical_score = 40 # base
    if length > 50: technical_score += 15
    if length > 150: technical_score += 15
    if length > 350: technical_score += 10
    technical_score += int(keyword_ratio * 20)
    technical_score = min(100, max(0, technical_score))

    # 3. Clarity & Structure (Logical transition words)
    clarity_score = 50
    structure_words = ["because", "first", "second", "example", "however", "therefore", "leads to", "finally", "comparison", "contrast"]
    structure_count = sum(1 for w in structure_words if w in clean_transcript)
    clarity_score += min(30, structure_count * 7)
    if length > 200: clarity_score += 10
    if length < 40: clarity_score -= 20
    clarity_score = min(100, max(0, clarity_score))

    # 4. Delivery (Filler word penalties)
    delivery_score = 90
    fillers = ["um", "uh", "like", "basically", "so ", "you know", "actually"]
    filler_count = 0
    for word in fillers:
        matches = re.findall(rf"\b{word.strip()}\b", clean_transcript)
        filler_count += len(matches)
        
    delivery_score -= min(50, filler_count * 6)
    if length < 30: delivery_score -= 10
    delivery_score = min(100, max(0, delivery_score))

    # 5. Confidence (Assertive vs Uncertain words)
    confidence_score = 80
    uncertainty_words = ["maybe", "i guess", "i think so", "not sure", "probably", "i don't know", "sort of", "kind of"]
    uncertainty_count = sum(1 for w in uncertainty_words if w in clean_transcript)
    
    assertive_words = ["definitely", "absolutely", "clearly", "experience", "designed", "implemented", "resolved"]
    assertive_count = sum(1 for w in assertive_words if w in clean_transcript)

    confidence_score -= min(40, uncertainty_count * 10)
    confidence_score += min(20, assertive_count * 5)
    if length < 50: confidence_score -= 15
    confidence_score = min(100, max(0, confidence_score))

    # 6. Overall
    overall_score = round((technical_score * 0.4) + (clarity_score * 0.25) + (delivery_score * 0.2) + (confidence_score * 0.15))

    # 7. Feedback generation
    if length < 40:
        feedback = f"Your response was extremely brief ({length} characters). An interviewer would expect a more detailed answer. Try to use the STAR method (Situation, Task, Action, Result) to detail your response."
    else:
        strengths = []
        improvements = []
        if len(keywords_matched) > 1:
            strengths.append(f"addressed key terms like {', '.join([f'\'{k}\'' for k in keywords_matched[:3]])}")
        elif length > 200:
            strengths.append("provided a reasonably comprehensive verbal explanation")
            
        if structure_count >= 2:
            strengths.append("used transition markers, making your logic easy to follow")
        if filler_count <= 2:
            strengths.append("delivered your response cleanly with very few filler words")
        if uncertainty_count == 0:
            strengths.append("spoke with assertion without relying on hedges")

        if len(keywords_matched) < 2:
            unmatched = [k for k in expected_keywords if k not in keywords_matched]
            improvements.append(f"incorporate more core terminology, such as {', '.join([f'\'{u}\'' for u in unmatched[:2]])}")
        if filler_count > 4:
            improvements.append("be mindful of filler words (you had multiple pauses filled with sounds like 'um' or 'like')")
        if uncertainty_count > 1:
            improvements.append("replace passive or uncertain phrasing ('I think', 'maybe') with active assertions")
        if length > 800:
            improvements.append("keep your answers concise (long descriptions risk losing focus; aim for 90-120 seconds)")

        strength_text = f"You did a great job: you {', and '.join(strengths)}." if strengths else "You provided a basic answer."
        improvement_text = f"To improve, you should focus on: {'; and '.join(improvements)}." if improvements else "Excellent delivery with no major areas of immediate improvement!"
        feedback = f"{strength_text} {improvement_text}"

    return {
        "score": overall_score,
        "feedback": feedback,
        "categories": {
            "technical": technical_score,
            "clarity": clarity_score,
            "delivery": delivery_score,
            "confidence": confidence_score
        },
        "keywordsMatched": keywords_matched
    }

# Gemini API call in Python
def analyze_with_gemini(api_key, role_label, question, transcript, expected_keywords):
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    system_prompt = f"""You are an expert technical interviewer and communication coach. 
Analyze the user's transcript response to the given interview question.
Assess the response across the following areas:
1. Technical accuracy and depth.
2. Clarity and structure of communication.
3. Delivery (presence of filler words, pacing).
4. Confidence shown in the wording.

The interview role is: "{role_label}".
The expected keywords/concepts related to this topic are: {", ".join(expected_keywords)}.

Provide your response strictly in the following JSON format:
{{
  "score": (overall score out of 100 as a number),
  "feedback": "Detailed constructive feedback summarizing strengths, what was missed, and how to improve. Highlight use of keywords or specific concepts.",
  "categories": {{
    "technical": (score 0-100 as a number),
    "clarity": (score 0-100 as a number),
    "delivery": (score 0-100 as a number),
    "confidence": (score 0-100 as a number)
  }},
  "keywordsMatched": [list of strings from the expected keywords list that were actually used or strongly implied in the transcript]
}}"""

    prompt = f"Question: \"{question}\"\n\nUser Response Transcript: \"{transcript}\""
    
    response = model.generate_content(
        contents=[system_prompt, prompt],
        generation_config={"response_mime_type": "application/json", "temperature": 0.2}
    )
    
    return json.loads(response.text)

# Routing - HTML Page
@app.route('/')
def home():
    return render_template('index.html')

# Routing - API endpoints
@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    data = request.json or {}
    role_label = data.get('roleLabel', 'Interviewee')
    question = data.get('question', '')
    transcript = data.get('transcript', '')
    expected_keywords = data.get('expectedKeywords', [])
    api_key = data.get('apiKey') or os.environ.get('GEMINI_API_KEY')

    if not transcript or not question:
        return jsonify({"error": "Missing transcript or question"}), 400

    if api_key:
        try:
            result = analyze_with_gemini(api_key, role_label, question, transcript, expected_keywords)
            return jsonify(result)
        except Exception as e:
            print(f"Gemini API failure: {e}. Falling back to local analysis.")
            local_result = analyze_locally(role_label, question, transcript, expected_keywords)
            return jsonify(local_result)
    else:
        # Perform local heuristic analysis
        local_result = analyze_locally(role_label, question, transcript, expected_keywords)
        return jsonify(local_result)

@app.route('/api/history', methods=['GET'])
def get_history():
    init_db()
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        history = json.load(f)
    return jsonify(history)

@app.route('/api/history', methods=['POST'])
def save_history():
    init_db()
    new_session = request.json
    if not new_session:
        return jsonify({"error": "No data provided"}), 400

    with open(DB_PATH, 'r', encoding='utf-8') as f:
        history = json.load(f)
        
    history.insert(0, new_session) # Prepend
    
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=4)
        
    return jsonify({"status": "success"})

@app.route('/api/clear_history', methods=['POST'])
def clear_history():
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump([], f, indent=4)
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(port=8085, debug=True)
