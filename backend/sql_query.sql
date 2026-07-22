 /* Candidate Data
 SELECT * FROM candidate;

2. Interview Data
SELECT * FROM interview_sessions;

 3. Jobs Data
SELECT * FROM job;

4. Naman ka complete data
SELECT
	c.full_name,
	c.email,
	c.domain,
	c.job_role,
	i.total_scores,
	i.recommendation,
	i.answers_count
FROM candidate c
LEFT JOIN interview_sessions i ON c.id = i.candidate_id
WHERE c.full_name ILIKE '%naman%';

5. HR Analytics View
SELECT
    c.full_name,
    c.email,
    c.domain,
    c.job_role,
    i.total_scores,
    i.recommendation,
    i.answers_count,
    j.job_title,
    j.domain AS job_domain
FROM candidate c
LEFT JOIN interview_sessions i ON c.id = i.candidate_id
LEFT JOIN job j ON c.job_id = j.id
ORDER BY i.total_scores DESC;

-- 6. HR Users
SELECT * FROM users WHERE role = 'hr';

-- 7. Candidate Users
SELECT * FROM users WHERE role = 'candidate';


--8. Sab Users (sorted)
SELECT 
    id,
    name,
    email,
    role
FROM users
ORDER BY role;

-- 9. HR + Candidate Complete Analytics
SELECT
    u.name,
    u.email,
    u.role,
    c.domain,
    c.job_role,
    i.total_scores,
    i.recommendation,
    i.answers_count
FROM users u
LEFT JOIN candidate c ON u.email = c.email
LEFT JOIN interview_sessions i ON c.id = i.candidate_id
ORDER BY u.role, i.total_scores DESC;


-- 10. Quick Check — Kitne HR hain
--SELECT role, COUNT(*) as total
FROM users
GROUP BY role;
*/




