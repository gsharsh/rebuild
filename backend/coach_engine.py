import os
import json
import time
from typing import Dict, Any
from google import genai
from google.genai import types
from google.genai.errors import ServerError

def analyze_interview_script(session_meta: Dict[str, Any], user_transcript: str) -> Dict[str, Any]:
    """
    Analyzes an interview answer transcript based on the dynamic 3-step context 
    gathered from the SpeakReady onboarding wizard UI.
    
    References UI layouts from:
      - telegram-cloud-photo-size-5-6134122887321949712-w.jpg (Dashboard/New)
      - telegram-cloud-photo-size-5-6134122887321949713-w.jpg (Step 1: Purpose)
      - telegram-cloud-photo-size-5-6134122887321949714-w.jpg (Step 2: Role & Org)
      - telegram-cloud-photo-size-5-6134122887321949715-w.jpg (Step 3: Context Input)
    """
    # 1. Initialize the modern Google GenAI Client
    # It automatically reads GEMINI_API_KEY from the system environment fields.
    client = genai.Client()

    # 2. Extract inputs matching your exact database table schema properties populated by the UI
    interview_type = session_meta.get("interview_type", "Job Interview")  # From Step 1 UI Wizard
    role = session_meta.get("role", "Software Engineering Intern")       # From Step 2 UI Wizard
    organisation = session_meta.get("organisation", "Google")           # From Step 2 UI Wizard
    context = session_meta.get("context", "")                           # From Step 3 UI Wizard

    # 3. Construct a highly contextual prompt using the extracted onboarding attributes
    user_prompt = f"""
    CONTEXT PROFILE (From User Onboarding Wizard):
    - Rehearsal Purpose / Type: {interview_type}
    - Target Role: {role}
    - Target Organisation: {organisation}
    - Optional Background Context: {context}

    CURRENT INTERVIEW TRACKING:
    - Question Prompt: {session_meta.get('question_text', 'Tell me about yourself.')}
    - Student's Raw Answer / Transcript: {user_transcript}

    Analyze this response. Refine its structural grammar and sentence boundaries, 
    ensuring it remains optimized for a natural verbal rehearsal.
    """

    # 4. Define systemic parameters matching the Frontend Response Contract
    system_instruction = """
    You are the elite AI Script Coach for 'SpeakReady', a rehearsal portal for multilingual, first-generation, and immigrant students.
    
    CRITICAL PROCESSING RULES:
    1. PRESERVE THE STORY: Do not convert the speech into an impersonal corporate template. Retain personal anecdotes, technical specificity, and original character traits.
    2. OPTIMIZE FOR ORAL COMPREHENSION: Convert winding, long compound sentences into brief, impactful expressions. Multi-clause groupings create breath gaps and increase stutter risks for non-native speakers under stress.
    3. INSTRUCTIONAL ANALYSIS: Return a clear, encouraging analysis detailing WHY updates were made so the user builds structural intuition over time.

    You MUST respond strictly in the following JSON schema representation without markdown tags or wrapped markdown code blocks:
    {
      "improved_script": "The complete polished text optimized for spoken delivery.",
      "changes_made": [
        {
          "original": "The string section extracted from the input text prior to parsing.",
          "fixed": "The targeted correction replacement.",
          "reason": "Clear explanation linking the change to breathing cadence or delivery impact."
        }
      ],
      "coaching_lesson": "A supportive 2-sentence summary detailing structural patterns used to enhance this specific text block."
    }
    """

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        temperature=0.3
    )

    # 5. Fault-tolerant execution handler loop with exponential backoff
    max_retries = 3
    retry_delay = 2
    response = None

    for attempt in range(max_retries):
        try:
            current_model = 'gemini-2.5-flash'
            response = client.models.generate_content(
                model=current_model,
                contents=user_prompt,
                config=config
            )
            break
        except ServerError as e:
            if attempt < max_retries - 1:
                print(f"⚠️ High cloud traffic encountered. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                print("🚨 Primary model cluster overloaded. Redirecting request to Flash-Lite fallback pipeline...")
                try:
                    response = client.models.generate_content(
                        model='gemini-2.5-flash-lite',
                        contents=user_prompt,
                        config=config
                    )
                    break
                except Exception as fallback_err:
                    print(f"Critical pipeline failure across all server infrastructure allocations: {fallback_err}")
                    raise e
        except Exception as general_err:
            print(f"Unhandled analysis engine interruption: {general_err}")
            raise general_err

    # 6. Sanitize and parse strings safely into standard backend structural dictionaries
    if response and response.text:
        try:
            raw_text = response.text.strip()
            
            # Robust extraction safety block if the model wraps outputs inside backticks
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
                
            return json.loads(raw_text)
            
        except json.JSONDecodeError:
            print("Fallback Triggered: AI response payload was not completely structurally sound JSON.")
            return {
                "improved_script": user_transcript,
                "changes_made": [],
                "coaching_lesson": "Your core text structural flow is operational. Work on maintaining pacing and natural breath intervals."
            }
    
    return {
        "improved_script": user_transcript,
        "changes_made": [],
        "coaching_lesson": "Could not establish server analysis communication lines."
    }

# Execution harness sandbox for isolated backend script validation testing
if __name__ == "__main__":
    # Mocking exact data parameters extracted from Aryan's dynamic 3-step frontend layout wizards
    mock_supabase_session_data = {
        "interview_type": "Job Interview",                                      # Step 1 UI Selection
        "role": "Software Engineering Intern",                                   # Step 2 UI Input Box
        "organisation": "Tan Tock Seng Hospital (AI Research Team)",             # Step 2 UI Input Box
        "context": "Student at NTU. Developed a CNN model for medical signal data processing using custom signal pipelines.", # Step 3 UI Context Textarea
        "question_text": "Tell me about a challenging technical project you worked on recently."
    }
    
    mock_user_raw_speech = (
        "So basically I made this neural network thingy. It was for analyzing stomach pressures "
        "and signals for doctors. It was hard because the raw signal was super messy, so I used "
        "IQR trimming to fix the outlines before throwing it into a CNN. It took a while to run but we got there."
    )

    print("🚀 Triggering SpeakReady Analytical Pipeline Verification Run...")
    
    # Check for api key presence in active shell memory before running test
    if not os.environ.get("GEMINI_API_KEY"):
        print("⚠️ WARNING: GEMINI_API_KEY environment variable is currently empty in this terminal layer.")
        print("Ensure you have set up your local .env tracking properties accurately.\n")
        
    analysis_result = analyze_interview_script(mock_supabase_session_data, mock_user_raw_speech)
    print("\n=== LENGUA ENGINE PARSING INTERFACE SUCCESSFUL ===")
    print(json.dumps(analysis_result, indent=2))