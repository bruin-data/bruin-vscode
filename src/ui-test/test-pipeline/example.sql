/* @bruin

name: myschema.example
type: bq.sql
description: |-
  # Example table
  This asset is an example table with some quality checks to help you get started.
owner: undefined

columns:
  - name: id
    type: integer
    description: Just a number
    primary_key: true
    checks:
      - name: not_null
      - name: positive
  - name: country
    type: varchar
    description: the country
    primary_key: true
    checks:
      - name: not_null
  - name: name
    type: varchar
    description: Just a name
    primary_key: true
    update_on_merge: true
    checks:
      - name: unique
      - name: not_null
      - name: positive
        value: ""


custom_checks:
  - name: match column counts
    query: SELECT COUNT(*) as count FROM myschema.example

@bruin */

SELECT 1 as id, 'Spain' as country , 'Juan' as name
union all
SELECT 2 as id, 'Germany' as country , 'Markus' as name
union all
SELECT 3 as id, 'France' as country , 'Antoine' as name
union all
SELECT 4 as id, 'Poland' as country , 'Franciszek' as name
