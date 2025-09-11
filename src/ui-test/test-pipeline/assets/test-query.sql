/* @bruin
name: test_query
type: dbt.sql
materialization:
    type: table

description: A test SQL query for integration testing
@bruin */

SELECT 
    id,
    name,
    created_at,
    COUNT(*) as total_count
FROM 
    source_table
WHERE 
    created_at >= '2023-01-01'
GROUP BY 
    id, name, created_at
ORDER BY 
    created_at DESC
LIMIT 100;