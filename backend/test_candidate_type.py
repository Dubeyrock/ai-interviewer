"""Test script to verify _infer_candidate_type fix for Non-IT candidates."""

from app.services.question_generator import _infer_candidate_type

# Test cases
test_cases = [
    # (domain, job_role, resume_text, skills, expected)
    ('IT', 'IT', '', [], 'it'),
    ('Non-IT', 'Non-IT', '', [], 'non_it'),
    ('Non-IT', 'Non-IT', 'I have experience in sales and marketing', [], 'non_it'),
    ('IT', 'IT', 'I know python and java', [], 'it'),
    ('', 'Sales Manager', 'I have 5 years experience in sales', ['sales', 'marketing'], 'non_it'),
    ('', 'Software Developer', 'I know python and django', ['python', 'django'], 'it'),
    # The bug case: Non-IT was incorrectly returning 'it' because 'it' is substring of 'non-it'
    ('Non-IT', 'HR Manager', 'I have experience in recruitment and HR', ['hr', 'recruitment'], 'non_it'),
    # Edge cases
    ('non-it', 'non-it', '', [], 'non_it'),
    ('NON-IT', 'NON-IT', '', [], 'non_it'),
    ('Non IT', 'Non IT', '', [], 'non_it'),
]

print('Testing _infer_candidate_type function:')
print('=' * 60)
all_passed = True
for domain, job_role, resume, skills, expected in test_cases:
    result = _infer_candidate_type(domain, job_role, resume, skills)
    status = 'PASS' if result == expected else 'FAIL'
    if result != expected:
        all_passed = False
    print(f'[{status}] domain="{domain}", job_role="{job_role}" -> {result} (expected: {expected})')

print('=' * 60)
if all_passed:
    print('SUCCESS: All tests passed!')
else:
    print('FAILURE: Some tests failed!')
    exit(1)