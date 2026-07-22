/*--1 Candidate Data
 SELECT * FROM candidate;




--2. Interview Data
SELECT * FROM interview_sessions;

-- 3. Jobs Data
SELECT * FROM job;

--4. Naman ka complete data
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

--5. HR Analytics View
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




-- 1. Job Setup –
SELECT * FROM job;


-- specific job setup
SELECT * FROM job WHERE job_title = 'Accountant';




--  HR Dashboard 
SELECT 
    j.job_title,
    j.domain,
    COUNT(DISTINCT c.id) AS total_candidates,
    COUNT(i.id) AS total_interviews,
    ROUND(AVG(i.total_scores)::NUMERIC, 2) AS avg_score,  
    COUNT(CASE WHEN i.recommendation = 'Hire' THEN 1 END) AS recommended_hire
FROM job j
LEFT JOIN candidate c ON c.job_id = j.id
LEFT JOIN interview_sessions i ON c.id = i.candidate_id
GROUP BY j.id, j.job_title, j.domain;
*/


/*SELECT
    c.full_name,
    c.email,
    c.domain,
    c.job_role,
    i.total_scores,
    i.recommendation,
    i.answers_count
FROM candidate c
LEFT JOIN interview_sessions i ON c.id = i.candidate_id
WHERE c.full_name ILIKE ANY (ARRAY['%olivia%', '%ramesh%', '%naman%']);
*/


--SELECT * FROM schedules;
/*SELECT 
    j.job_title,
    j.domain,
    COUNT(DISTINCT c.id) AS total_candidates,
    COUNT(i.id) AS total_interviews,
    ROUND(AVG(i.total_scores)::NUMERIC, 2) AS avg_score,   -- यहाँ ::NUMERIC डाला
    COUNT(CASE WHEN i.recommendation = 'Hire' THEN 1 END) AS recommended_hire
FROM job j
LEFT JOIN candidate c ON c.job_id = j.id
LEFT JOIN interview_sessions i ON c.id = i.candidate_id
GROUP BY j.id, j.job_title, j.domain;
*/


/*SELECT
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
ORDER BY u.role, i.total_scores DESC NULLS LAST;

*/


 SELECT * FROM candidate;