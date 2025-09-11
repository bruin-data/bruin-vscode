/* @bruin
name: test_bigquery
type: bq.sql
materialization:
    type: view

connection: bigquery_connection

description: A test BigQuery asset for integration testing

columns:
  - name: user_id
    type: INTEGER
    description: User identifier
    checks:
      - name: not_null
  - name: event_name
    type: STRING
    description: Event name
  - name: event_timestamp
    type: TIMESTAMP
    description: When the event occurred

@bruin */

SELECT 
    user_id,
    event_name,
    event_timestamp,
    COUNT(*) OVER (PARTITION BY user_id) as user_event_count
FROM 
    `{{ env.BIGQUERY_PROJECT }}.analytics.events`
WHERE 
    event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
    AND user_id IS NOT NULL
ORDER BY 
    event_timestamp DESC;